# Dance Ops

Приложение для добавления дат мероприятий и распределения выступлений между двумя составами. Работает как статический Next.js-сайт и хранит данные в Appwrite.

## Локальный запуск

1. Скопируйте `.env.example` в `.env.local`.
2. Заполните `NEXT_PUBLIC_APPWRITE_PROJECT_ID`.
3. Создайте базу и коллекции в Appwrite по схеме ниже.
4. Запустите:

```bash
npm install
npm run dev
```

## Appwrite

Создайте базу `dance_ops`.

Коллекция `days`:

| Поле | Тип | Обязательное |
| --- | --- | --- |
| `date` | string | да |
| `first_team_name` | string | нет |
| `second_team_name` | string | нет |

Коллекция `events`:

| Поле | Тип | Обязательное |
| --- | --- | --- |
| `title` | string | да |
| `time` | string | да |
| `place` | string | нет |
| `road` | string | нет |
| `team` | enum/string: `first`, `second` | да |
| `day_id` | string | да |

Для клиентского приложения нужны права на чтение, создание, обновление и удаление документов. Если приложение закрыто паролем только на уровне интерфейса, в Appwrite обычно ставят permissions для `Any`, но надежнее подключить Appwrite Auth и ограничить доступ пользователями.

## Деплой в Timeweb Cloud

Build command:

```bash
npm run build
```

Publish directory:

```bash
out
```

Переменные окружения в Timeweb Cloud должны совпадать с `.env.example`.
