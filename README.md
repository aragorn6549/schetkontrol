# AI Website Builder Platform

Платформа для создания веб-сайтов с помощью искусственного интеллекта. Пользователи могут описывать желаемый сайт в чате, а ИИ генерирует готовый код и развертывает его.

## 🚀 Возможности

- **Чат-интерфейс** для общения с ИИ-ассистентом
- **Генерация кода** на основе текстового описания
- **Предпросмотр** созданного сайта в реальном времени
- **История проектов** с возможностью возврата к предыдущим версиям
- **Редактирование кода** с подсветкой синтаксиса
- **Экспорт проекта** для локальной разработки

## 🛠 Технологический стек

### Frontend
- **Next.js 14** - React фреймворк с App Router
- **TypeScript** - типизация JavaScript
- **Tailwind CSS** - утилитарный CSS-фреймворк
- **Shadcn/ui** - библиотека компонентов
- **Lucide React** - иконки
- **React Hook Form** - управление формами
- **Zod** - валидация схем

### Backend & API
- **Supabase** - база данных и аутентификация
- **Edge Functions** - серверная логика
- **DeepSeek API** - интеграция с ИИ для генерации кода

### Развертывание
- **Vercel** - хостинг для Next.js приложений
- **Supabase** - облачная инфраструктура

## 📋 Требования

- Node.js 18+ 
- npm или yarn
- Аккаунт в [Supabase](https://supabase.com)
- API ключ [DeepSeek](https://platform.deepseek.com)

## ⚙️ Установка

1. Клонируйте репозиторий:
```bash
git clone <repository-url>
cd ai-website-builder
```

2. Установите зависимости:
```bash
npm install
```

3. Скопируйте файл окружения:
```bash
cp .env.local.example .env.local
```

4. Настройте переменные окружения в `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
DEEPSEEK_API_KEY=your_deepseek_api_key
```

5. Запустите миграции базы данных в Supabase (см. `/supabase/migrations`)

6. Запустите проект в режиме разработки:
```bash
npm run dev
```

Откройте [http://localhost:3000](http://localhost:3000) в браузере.

## 📁 Структура проекта

```
├── app/                      # Next.js App Router
│   ├── api/                  # API маршруты
│   ├── dashboard/            # Панель управления
│   ├── editor/               # Редактор кода
│   ├── preview/              # Предпросмотр сайтов
│   └── page.tsx              # Главная страница
├── components/               # React компоненты
│   ├── ui/                   # Базовые UI компоненты
│   ├── chat/                 # Компоненты чата
│   ├── editor/               # Компоненты редактора
│   └── layout/               # Компоненты макета
├── lib/                      # Утилиты и вспомогательные функции
├── hooks/                    # Custom React хуки
├── types/                    # TypeScript типы
├── supabase/                 # Конфигурация Supabase
│   └── migrations/           # Миграции базы данных
└── public/                   # Статические файлы
```

## 🗄 Схема базы данных

Основные таблицы:
- `profiles` - профили пользователей
- `projects` - проекты сайтов
- `project_versions` - версии проектов
- `chat_messages` - сообщения чата
- `generated_code` - сгенерированный код

Подробная схема доступна в файлах миграций `/supabase/migrations/`.

## 🔌 API Интеграции

### DeepSeek API
Используется для генерации кода сайтов на основе пользовательских запросов.

Настройка:
1. Получите API ключ на [DeepSeek Platform](https://platform.deepseek.com)
2. Добавьте ключ в `.env.local` как `DEEPSEEK_API_KEY`

### Supabase
Обеспечивает хранение данных, аутентификацию и real-time обновления.

Настройка:
1. Создайте проект на [Supabase](https://supabase.com)
2. Скопируйте URL и Anon Key в `.env.local`
3. Примените миграции из папки `/supabase/migrations/`

## 🚀 Развертывание

### Vercel (рекомендуется)

1. Установите Vercel CLI:
```bash
npm install -g vercel
```

2. Разверните проект:
```bash
vercel
```

3. Настройте переменные окружения в панели управления Vercel

### Production сборка

```bash
npm run build
npm start
```

## 🧪 Тестирование

```bash
npm run test
```

## 🤝 Вклад в проект

1. Fork репозиторий
2. Создайте ветку (`git checkout -b feature/amazing-feature`)
3. Закоммитьте изменения (`git commit -m 'Add amazing feature'`)
4. Отправьте в ветку (`git push origin feature/amazing-feature`)
5. Откройте Pull Request

## 📝 Лицензия

MIT License - подробности в файле LICENSE

## 👥 Контакты

- Автор проекта
- [GitHub Issues](../../issues) для багов и предложений

## 🙏 Благодарности

- [DeepSeek](https://deepseek.com) за предоставление AI API
- [Supabase](https://supabase.com) за инфраструктуру
- [Shadcn/ui](https://ui.shadcn.com) за компоненты интерфейса
- [Vercel](https://vercel.com) за хостинг

---

**Статус проекта**: В разработке 🚧

Для вопросов и поддержки создавайте issue в репозитории.
