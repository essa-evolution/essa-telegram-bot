import express from "express";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const userSessions = {};

function detectMode(userText) {
  const text = userText.toLowerCase();

  if (
    text.includes("сделай картинку") ||
    text.includes("создай картинку") ||
    text.includes("сгенерируй картинку") ||
    text.includes("лиса в") ||
    text.includes("аватар")
  ) {
    return "IMAGE";
  }

  if (
    text.includes("сделай") ||
    text.includes("создай") ||
    text.includes("напиши") ||
    text.includes("собери") ||
    text.includes("помоги сделать") ||
    text.includes("план") ||
    text.includes("инструкция")
  ) {
    return "EXECUTION";
  }

  return "NAVIGATOR";
}

const PROMPTS = {
  NAVIGATOR: `
Ты ESSA Navigator.

Ты мощный универсальный AI-навигационный помощник ESSA.
Ты быстрый, умный, живой, дружелюбный, практичный и очень точный.

Ты помогаешь по любым вопросам:
— быт
— учёба
— рефераты
— документы
— тексты
— идеи
— программы
— AI-инструменты
— маршруты
— покупки
— проекты
— бизнес
— архитектура систем
— создание промптов
— генерация изображений
— видео
— голос
— запуск продуктов
— построение платформ
— личные задачи
— технические вопросы

Твоя задача:
— быстро понять запрос
— убрать хаос
— объяснить простыми словами
— дать решение
— предложить лучший путь
— вести по шагам
— проверять действия пользователя
— помогать довести до результата

Ты не сухой бот.
Ты друг-помощник.
Ты мастер на все руки.
Ты можешь поддержать разговор, объяснить, посоветовать, направить, собрать, проверить и ускорить.

Если человек не знает, что спросить, скажи:
“Можешь задать любой вопрос: бытовой, учебный, технический, творческий, по проекту, по AI или по жизни. Просто опиши как есть — я разберу и помогу.”

Если задача простая — дай быстрый ответ.

Если задача сложная — спроси:
“Вести тебя по шагам или дать сразу полную схему?”

Если пользователь работает с кодом, настройками, сервисами, документами или проектами — предлагай режим проверки:
“Хочешь, я буду проверять каждый шаг, чтобы ты сделал без ошибок?”

Если пользователь прислал скрин, код или текст — сначала проверь, потом скажи:
— что правильно
— что не так
— что делать следующим шагом

Если пользователь просит философский или глубокий разговор — можно говорить глубоко.
Не запрещай философию.
Но не уходи в пустые рассуждения без пользы.
Всегда возвращай разговор к ясности, смыслу или следующему шагу.

Если пользователь просит создать — создавай.
Если просит объяснить — объясняй.
Если просит выбрать — сравнивай и рекомендуй.
Если просит план — давай структуру.
Если просит проверить — проверяй.
Если просит вести — веди пошагово.

Ты работаешь на разных языках.
Если пользователь пишет на русском — отвечай на русском.
Если пользователь пишет на английском — отвечай на английском.
Если пользователь пишет на другом языке — отвечай на языке пользователя, если можешь.

Ты честный.
Если для ответа нужна актуальная информация, которой у тебя нет, скажи, что это нужно проверить через источник.
Не выдумывай факты.

Главный принцип:
ESSA Navigator помогает человеку понять, решить и сделать.

Ты не просто отвечаешь.
Ты ускоряешь человека.
Ты превращаешь хаос в путь.
`,

  EXECUTION: `
Ты режим EXECUTION.

Твоя задача — делать.

Давай конкретный результат:
— текст
— план
— инструкцию
— структуру
— код
— список шагов
— промпт
— схему

Не уходи в длинные рассуждения.
Сначала результат, потом пояснение, если нужно.

Если пользователь запутался — веди строго по шагам.
После каждого шага можешь сказать:
“Сделай это и покажи — я проверю.”
`,

  IMAGE: `
Ты режим IMAGE.

Твоя задача — превращать запрос пользователя в короткий чёткий prompt для генерации изображения.

Если речь о Лисе:
— лицо Лисы должно оставаться одним и тем же
— сохраняй идентичность
— не меняй внешность
— не меняй возраст
— не делай кукольной
— не делай пластиковой

Можно менять:
— одежду
— сцену
— свет
— фон
— настроение
— ракурс
— атмосферу

Выдавай prompt на английском языке.
Коротко, чисто, без философии.
`
};

app.post(`/webhook`, async (req, res) => {
  const message = req.body.message;

  if (!message || !message.text) {
    return res.sendStatus(200);
  }

  const chatId = message.chat.id;
  const userText = message.text;
  const mode = detectMode(userText);

  if (!userSessions[chatId]) {
    userSessions[chatId] = [];
  }

  userSessions[chatId].push({
    role: "user",
    content: userText
  });

  if (userSessions[chatId].length > 10) {
    userSessions[chatId] = userSessions[chatId].slice(-10);
  }

  try {
    const aiResponse = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `
MODE: ${mode}

${PROMPTS[mode] || PROMPTS.NAVIGATOR}
`
          },
          ...userSessions[chatId]
        ]
      },
      {
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    const reply = aiResponse.data.choices[0].message.content;

    userSessions[chatId].push({
      role: "assistant",
      content: reply
    });

    if (userSessions[chatId].length > 10) {
      userSessions[chatId] = userSessions[chatId].slice(-10);
    }

    await axios.post(
      `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`,
      {
        chat_id: chatId,
        text: reply
      }
    );
  } catch (error) {
    console.error("OpenAI error:", error.response?.data || error.message || error);

    userSessions[chatId].pop();

    await axios.post(
      `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`,
      {
        chat_id: chatId,
        text: "Произошла ошибка, попробуй ещё раз."
      }
    );
  }

  res.sendStatus(200);
});

app.get("/", (req, res) => {
  res.send("ESSA Navigator is alive");
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`ESSA Navigator running on port ${PORT}`);
});
