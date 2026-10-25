# PlaySlot

PlaySlot — платформа для бронирования спортивных площадок.

Бэкенд: **Java 21 + Spring Boot** (Web MVC, Security, Data JPA), база данных — **PostgreSQL**.
Фронтенд — одностраничное приложение на чистом HTML/JS, лежит в `src/main/resources/static/`
(`index.html`, `api.js`, `app.js`) и отдаётся тем же Spring Boot-приложением.
**Node.js-сервера в проекте нет**, сборка фронтенда не требуется.

## Требования

- JDK 21
- PostgreSQL, запущенный на порту 5432
- Maven устанавливать не нужно — в репозитории есть обёртки `mvnw` (Linux/macOS) и `mvnw.cmd` (Windows).

## Создание базы данных

Имя базы регистрозависимо, поэтому его обязательно нужно брать в кавычки:

```sql
CREATE DATABASE "PlaySlot";
```

Например, через `psql`:

```bash
psql -U postgres -c 'CREATE DATABASE "PlaySlot";'
```

## Настройки подключения

В `src/main/resources/application.properties` используются переменные окружения со значениями по умолчанию:

| Переменная   | Значение по умолчанию                       |
|--------------|---------------------------------------------|
| `DB_URL`     | `jdbc:postgresql://localhost:5432/PlaySlot` |
| `DB_USERNAME`| `postgres`                                  |
| `DB_PASSWORD`| `postgres`                                  |

Задать переменные можно перед запуском:

PowerShell (Windows):

```powershell
$env:DB_URL="jdbc:postgresql://localhost:5432/PlaySlot"
$env:DB_USERNAME="postgres"
$env:DB_PASSWORD="ваш_пароль"
```

Bash (Linux/macOS):

```bash
export DB_URL="jdbc:postgresql://localhost:5432/PlaySlot"
export DB_USERNAME="postgres"
export DB_PASSWORD="ваш_пароль"
```

## Администратор (опционально)

Зарегистрировать пользователя с ролью `ADMIN` через сайт нельзя. Учётная запись `ADMIN`
создаётся при старте приложения, если заданы **обе** переменные окружения:

```bash
export ADMIN_EMAIL="admin@example.com"
export ADMIN_PASSWORD="ваш_пароль"
```

```powershell
$env:ADMIN_EMAIL="admin@example.com"
$env:ADMIN_PASSWORD="ваш_пароль"
```

Если хотя бы одна из переменных не задана, администратор не создаётся. Если пользователь
с таким e-mail уже существует, дубликат не создаётся.

## Запуск

```powershell
.\mvnw.cmd spring-boot:run
```

или на Linux/macOS:

```bash
./mvnw spring-boot:run
```

После запуска откройте <http://localhost:8080>.

- Проверка подключения к базе: <http://localhost:8080/api/health/database> — должен вернуть `{"status":"connected"}`.
- Список API-эндпоинтов: <http://localhost:8080/api>.

## Наполнение сайта данными

База стартует пустой, поэтому список площадок изначально пуст. Типовой порядок действий:

1. Зарегистрируйтесь на сайте как **OWNER** и добавьте площадку — она получит статус `PENDING`.
2. Войдите под учётной записью **ADMIN** (см. выше) и подтвердите площадку — статус изменится на `APPROVED`.
3. После одобрения площадка становится публичной, и пользователи с ролью **PLAYER** могут её бронировать.

## Тесты

```bash
./mvnw test
```

Тесты используют in-memory базу H2 (`src/test/resources/application.properties`),
PostgreSQL для их запуска не нужен.

## Примечания

- Шрифты и Tailwind CSS подключаются из CDN (Google Fonts, `cdn.tailwindcss.com`),
  поэтому браузеру нужен доступ в интернет.
- Макет дизайна находится в каталоге `docs/design/`.
