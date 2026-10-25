# PlaySlot

🌐 **Languages:** [English](#playslot) · [Қазақша](#playslot-қазақша) · [На русском](#playslot-на-русском)

PlaySlot is a full-stack sports court booking and pickup-game platform. Users can browse and book courts, join or create games, manage teams, and leave reviews, while court owners manage their facilities and an admin oversees the entire marketplace.

Built with **Spring Boot 4.1**, **Java 21**, **PostgreSQL**, and a vanilla JavaScript single-page frontend served from `src/main/resources/static`.

## Features

- **Authentication & Roles** — Session-based login/register with three roles: `PLAYER`, `OWNER`, `ADMIN`. Passwords are hashed with BCrypt; CSRF protection uses a double-submit cookie pattern.
- **Court Booking** — Browse approved courts, check per-court availability, and create bookings. Owners confirm, cancel, or complete pending requests (`PENDING → CONFIRMED / CANCELLED / COMPLETED`).
- **Games** — Create pickup games for a sport and court, join or leave them; games require admin approval (`PENDING → APPROVED / REJECTED`).
- **Teams** — Create teams, join or leave them, and list your own teams.
- **Reviews** — Rate and review courts, with an aggregated rating summary per court.
- **Owner Dashboard** — Court owners create and update their courts and view booking summaries (`FOOTBALL`, `BASKETBALL`, `VOLLEYBALL`, `TENNIS` supported).
- **Admin Panel** — Approve/reject courts, games, and bookings; manage user roles; view platform-wide summaries.
- **Home Feed & Profile** — Aggregated home page data and editable user profiles.
- **Database Health Check** — Simple readiness endpoint at `/api/health/database`.

## Tech Stack

| Layer        | Technology                                              |
|--------------|---------------------------------------------------------|
| Backend      | Spring Boot 4.1 (Web MVC, Security, Data JPA), Java 21  |
| Database     | PostgreSQL (runtime), H2 (in-memory, for tests)         |
| Frontend     | Vanilla JS SPA (`app.js`, `api.js`, `index.html`)       |
| Build        | Maven (wrapper included)                                |

## Project Structure

```
.
├── pom.xml                     # Maven build (Spring Boot parent, Java 21)
├── mvnw / mvnw.cmd             # Maven wrapper scripts
├── request.http                # Sample HTTP request for quick testing
├── build_app_js.js             # Node script that assembles static/app.js from i18n + app logic
├── docs/design/                # UI design mockups
└── src
    ├── main
    │   ├── java/com/playslot/playslot
    │   │   ├── PlaySlotApplication.java     # Entry point; seeds admin user from env vars
    │   │   ├── SecurityConfig.java          # Sessions, CSRF, role-based rules
    │   │   ├── *Controller.java             # REST controllers (auth, courts, bookings, ...)
    │   │   ├── model/                       # JPA entities & enums (User, Court, Booking, Game, Team, Review)
    │   │   └── repository/                  # Spring Data JPA repositories
    │   └── resources
    │       ├── application.properties       # Datasource config (env-overridable)
    │       └── static/                      # SPA frontend (index.html, app.js, api.js, i18n)
    └── test                                 # Tests run against in-memory H2
```

## Getting Started

### Prerequisites

- Java 21+
- PostgreSQL (or any JDBC-compatible DB you point the config at)
- Docker is optional but handy for Postgres:
  ```bash
  docker run --name playslot-db -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres
  ```

### Configuration

Database connection and admin bootstrap are controlled via environment variables (defaults shown):

| Variable        | Default                                        | Description                          |
|-----------------|------------------------------------------------|--------------------------------------|
| `DB_URL`        | `jdbc:postgresql://localhost:5432/PlaySlot`    | JDBC datasource URL                  |
| `DB_USERNAME`   | `postgres`                                     | Database username                    |
| `DB_PASSWORD`   | `postgres`                                     | Database password                    |
| `ADMIN_EMAIL`   | *(empty)*                                      | If set with `ADMIN_PASSWORD`, an ADMIN account is created on startup |
| `ADMIN_PASSWORD`| *(empty)*                                      | Admin account password               |

Schema is managed by Hibernate (`spring.jpa.hibernate.ddl-auto=update`).

### Run

```bash
./mvnw spring-boot:run
```

Then open http://localhost:8080 — the SPA is served by `FrontendController`.

### Build

```bash
./mvnw clean package
java -jar target/PlaySlot-0.0.1-SNAPSHOT.jar
```

### Tests

Tests use an in-memory H2 database (`src/test/resources/application.properties`):

```bash
./mvnw test
```

## API Overview

All endpoints are JSON REST APIs under `/api`. Mutating requests require a session cookie plus a CSRF token (available via `GET /api/auth/csrf`).

### Auth (`/api/auth`)
| Method | Path              | Description                     |
|--------|-------------------|---------------------------------|
| GET    | `/csrf`           | Obtain CSRF token               |
| POST   | `/register`       | Register a new user             |
| POST   | `/login`          | Start session                   |
| POST   | `/logout`         | End session                     |
| GET    | `/me`             | Current user info               |

### Courts & Bookings
| Method | Path                                  | Description                              |
|--------|---------------------------------------|------------------------------------------|
| GET    | `/api/courts`                         | List approved courts                     |
| GET    | `/api/courts/{id}`                    | Court details                            |
| GET    | `/api/courts/{courtId}/availability`  | Booking availability for a court         |
| POST   | `/api/bookings`                       | Create a booking                         |
| GET    | `/api/bookings/mine`                  | My bookings                              |
| GET    | `/api/owner/bookings`                 | Bookings for owner's courts (OWNER)      |
| PUT    | `/api/bookings/{id}/status`           | Update booking status (OWNER)            |

### Games, Teams, Reviews, Profile, Home
| Method | Path                                   | Description                       |
|--------|----------------------------------------|-----------------------------------|
| GET    | `/api/games`                           | List games                        |
| POST   | `/api/games`                           | Create a game                     |
| POST   | `/api/games/{id}/join` / `/leave`      | Join / leave a game               |
| GET    | `/api/teams`, `/api/teams/mine`        | List teams / my teams             |
| POST   | `/api/teams`                           | Create a team                     |
| POST   | `/api/teams/{id}/join` / `/leave`      | Join / leave a team               |
| GET/POST | `/api/courts/{courtId}/reviews`      | List / write reviews (+ `/summary`) |
| GET/PUT| `/api/profile`                         | View / update profile             |
| GET    | `/api/home`                            | Home page aggregated data         |
| GET    | `/api/health/database`                 | Database health check             |

### Owner (`/api/owner/courts`)
`GET` list, `GET /summary`, `POST` create, `PUT /{id}` update — restricted to `OWNER` role.

### Admin (`/api/admin`)
`GET` lists for courts/bookings/games/users, `PATCH` endpoints for court/game status and user roles, plus `GET /summary` — restricted to `ADMIN` role.

## Domain Model

- **User** — name, email, hashed password, `UserRole` (`PLAYER`, `OWNER`, `ADMIN`)
- **Court** — owned by a User, sport type, location, price, `CourtStatus` (`PENDING`, `APPROVED`, `REJECTED`)
- **Booking** — user + court + time slot, `BookingStatus` (`PENDING`, `CONFIRMED`, `CANCELLED`, `COMPLETED`)
- **Game** — organized match on a court, `GameStatus` (`PENDING`, `APPROVED`, `REJECTED`), participant roster
- **Team** — group of players
- **Review** — rating and comment on a court

## Frontend Build (optional)

The SPA bundle can be regenerated with Node:

```bash
node build_app_js.js
```

This merges `i18n_extracted.js` with the app logic into `src/main/resources/static/app.js`.

## Design Assets

UI mockups live in [`docs/design/`](docs/design).

---

# PlaySlot (Казақша)

PlaySlot — спорт алаңдарын брондау және жетіп барып ойнайтын ойындар ұйымдастыруға арналған толық стекті платформа. Пайдаланушылар алаңдарды қарап, брондай алады, ойындарға қосыла немесе жасай алады, командаларды басқарады және пікір қалдырады; ал алаң иелері өз нысандарын басқарып, әкімші (admin) нарықтың тұтас бақылауын жүргізеді.

**Spring Boot 4.1**, **Java 21**, **PostgreSQL** және `src/main/resources/static` бөлімінен берілетін vanilla JavaScript бір беттік фронтенді негізінде жасалған.

## Мүмкіндіктері

- **Аутентификация мен рөлдер** — Сессияға негізделген кіру/тіркелу үш рөлмен: `PLAYER`, `OWNER`, `ADMIN`. Құпиясөздер BCrypt арқылы хештеленеді; CSRF қорғанысы қос жапырақ жіберу (double-submit cookie) үлгісін қолданады.
- **Алаңдарды брондау** — Бекітілген алаңдарды шолып, алаң бойынша қолжетімділікті тексеріп, брондау жасау. Иелер күтіп тұрған сұраныстарды растайды, береді немесе аяқтайды (`PENDING → CONFIRMED / CANCELLED / COMPLETED`).
- **Ойындар** — Спорт пен алаңға арналған ойындар жасап, оларға қосылу/шығу; ойындар әкімші бекітуін талап етеді (`PENDING → APPROVED / REJECTED`).
- **Командалар** — Командалар жасау, қосу/шығу және өз командаларыңызды тізімдеу.
- **Пікірлер** — Алаңдарды бағалап, пікір қалдыру; әр алаң бойынша жиынтық рейтинг.
- **Ие панелі** — Алаң иелері өз алаңдарын жасайды, жаңартады және брондау жиынтығын көреді (`FOOTBALL`, `BASKETBALL`, `VOLLEYBALL`, `TENNIS` қолданылады).
- **Әкімші панелі** — Алаңдарды, ойындарды және брондауларды бекіту/бас тарту; пайдаланушы рөлдерін басқару; платформа бойынша жиынтықтарды көру.
- **Басты бет және профиль** — Басты беттің жиынтық деректері және өңделетін пайдаланушы профилі.
- **Дерекқордың денсаулығын тексеру** — `/api/health/database` мекенжайындағы дайындық endpoint-і.

## Технологиялық стек

| Қабат        | Технология                                            |
|--------------|---------------------------------------------------------|
| Бэкенд       | Spring Boot 4.1 (Web MVC, Security, Data JPA), Java 21  |
| Дерекқор     | PostgreSQL (жұмыс уақытында), H2 (тестерге арналған жадыдағы дерекқор) |
| Фронтенд     | Vanilla JS SPA (`app.js`, `api.js`, `index.html`)       |
| Жинақтау     | Maven (wrapper қосылған)                                |

## Жоба құрылымы

Жоба құрылымы жоғарыдағы «Project Structure» бөлімінде көрсетілген (`pom.xml`, `mvnw`, `src/main/java/com/playslot/playslot`, `model/`, `repository/`, `static/` және т.б.).

## Іске қосу

### Алдын ала шарттар

- Java 21+
- PostgreSQL (немесе конфигурацияға көрсетілген кез келген JDBC-үйлесімді дерекқор)
- Docker міндетті емес, бірақ Postgres үшін ыңғайлы:
  ```bash
  docker run --name playslot-db -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres
  ```

### Конфигурация

Дерекқорға қосылу және әкімшіді бастапқы дайындау орта айнымалылары арқылы реттеледі (әдепкі мәндер көрсетілген):

| Айнымалы      | Әдепкі мән                                   | Сипаттамасы                          |
|-----------------|------------------------------------------------|--------------------------------------|
| `DB_URL`        | `jdbc:postgresql://localhost:5432/PlaySlot`    | JDBC дереккөз URL-і                  |
| `DB_USERNAME`   | `postgres`                                     | Дерекқор пайдаланушысы               |
| `DB_PASSWORD`   | `postgres`                                     | Дерекқор құпиясөзі                   |
| `ADMIN_EMAIL`   | *(бос)*                                      | `ADMIN_PASSWORD` бірге қойылса, іске қосу кезінде ADMIN есебі жасалады |
| `ADMIN_PASSWORD`| *(бос)*                                      | Әкімші есебінің құпиясөзі            |

Схема Hibernate арқылы басқарылады (`spring.jpa.hibernate.ddl-auto=update`).

### Жұмысқа қосу

```bash
./mvnw spring-boot:run
```

Содан кейін http://localhost:8080 ашыңыз — SPA `FrontendController` арқылы беріледі.

### Жинақтау

```bash
./mvnw clean package
java -jar target/PlaySlot-0.0.1-SNAPSHOT.jar
```

### Тестер

Тестер жадыдағы H2 дерекқорын қолданады (`src/test/resources/application.properties`):

```bash
./mvnw test
```

## API шолуы

Барлық endpoint-тер `/api` астындағы JSON REST API болып табылады. Өзгеріс енгізетін сұраныстар сессия жапырақшасын (cookie) және CSRF token-ін талап етеді (ол `GET /api/auth/csrf` арқылы алынады). Endpoint-тердің толық кестесі жоғарыдағы «API Overview» бөлімінде: `/api/auth`, `/api/courts`, `/api/bookings`, `/api/games`, `/api/teams`, `/api/owner/...`, `/api/admin/...`, `/api/profile`, `/api/home`, `/api/health/database`.

## Домен моделі

- **User (Пайдаланушы)** — аты, email, хештелген құпиясөз, `UserRole` (`PLAYER`, `OWNER`, `ADMIN`)
- **Court (Алаң)** — User иелігінде, спорт түрі, орны, бағасы, `CourtStatus` (`PENDING`, `APPROVED`, `REJECTED`)
- **Booking (Брондау)** — пайдаланушы + алаң + уақыт слоты, `BookingStatus` (`PENDING`, `CONFIRMED`, `CANCELLED`, `COMPLETED`)
- **Game (Ойын)** — алаңдағы ұйымдастырылған кездесу, `GameStatus` (`PENDING`, `APPROVED`, `REJECTED`), қатысушылар құрамы
- **Team (Команда)** — ойыншылар тобы
- **Review (Пікір)** — алаңға қойылған баға мен пікір

## Фронтендті жинақтау (міндетті емес)

SPA байламдарын Node арқылы қайта жасауға болады:

```bash
node build_app_js.js
```

Бұл `i18n_extracted.js` файлын қосымша логикасымен біріктіріп, `src/main/resources/static/app.js` файлына жазады.

## Дизайн ресурстары

UI макеттері [`docs/design/`](docs/design) бөлімінде орналасқан.

---

# PlaySlot (На русском)

PlaySlot — это полнофункциональная платформа для бронирования спортивных площадок и организации дворовых игр (pickup games). Пользователи могут просматривать и бронировать площадки, создавать игры или присоединяться к ним, управлять командами и оставлять отзывы, тогда как владельцы площадок управляют своими объектами, а администратор контролирует весь маркетплейс.

Построена на **Spring Boot 4.1**, **Java 21**, **PostgreSQL** и одностраничном фронтенде на ванильном JavaScript, который отдаётся из `src/main/resources/static`.

## Возможности

- **Аутентификация и роли** — Вход/регистрация на основе сессий с тремя ролями: `PLAYER`, `OWNER`, `ADMIN`. Пароли хешируются с помощью BCrypt; CSRF-защита использует схему двойной отправки cookie (double-submit cookie).
- **Бронирование площадок** — Просмотр одобренных площадок, проверка доступности по каждой площадке и создание бронирований. Владельцы подтверждают, отменяют или завершают ожидающие заявки (`PENDING → CONFIRMED / CANCELLED / COMPLETED`).
- **Игры** — Создание игр под выбранный вид спорта и площадку, вход в игру и выход из неё; игры требуют одобрения администратором (`PENDING → APPROVED / REJECTED`).
- **Команды** — Создание команд, вступление и выход, просмотр списка своих команд.
- **Отзывы** — Оценка и отзывы о площадках с агрегированным рейтингом по каждой площадке.
- **Панель владельца** — Владельцы создают и обновляют свои площадки и смотрят сводку бронирований (поддерживаются `FOOTBALL`, `BASKETBALL`, `VOLLEYBALL`, `TENNIS`).
- **Панель администратора** — Одобрение/отклонение площадок, игр и бронирований; управление ролями пользователей; просмотр сводок по всей платформе.
- **Главная и профиль** — Агрегированные данные главной страницы и редактируемый профиль пользователя.
- **Проверка состояния БД** — Простой endpoint готовности `/api/health/database`.

## Технологический стек

| Слой           | Технология                                            |
|----------------|-------------------------------------------------------|
| Бэкенд         | Spring Boot 4.1 (Web MVC, Security, Data JPA), Java 21 |
| База данных    | PostgreSQL (в рантайме), H2 (in-memory, для тестов)   |
| Фронтенд       | Vanilla JS SPA (`app.js`, `api.js`, `index.html`)      |
| Сборка         | Maven (wrapper включён)                               |

## Структура проекта

Структура проекта приведена выше в разделе «Project Structure» (`pom.xml`, `mvnw`, `src/main/java/com/playslot/playslot`, `model/`, `repository/`, `static/` и т.д.).

## Начало работы

### Предварительные требования

- Java 21+
- PostgreSQL (или любая JDBC-совместимая БД, на которую указывает конфигурация)
- Docker не обязателен, но удобен для Postgres:
  ```bash
  docker run --name playslot-db -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres
  ```

### Конфигурация

Подключение к базе данных и первичное создание администратора управляются переменными окружения (значения по умолчанию указаны):

| Переменная    | Значение по умолчанию                        | Описание                             |
|---------------|----------------------------------------------|--------------------------------------|
| `DB_URL`      | `jdbc:postgresql://localhost:5432/PlaySlot`  | JDBC URL источника данных            |
| `DB_USERNAME` | `postgres`                                   | Имя пользователя БД                  |
| `DB_PASSWORD` | `postgres`                                   | Пароль пользователя БД               |
| `ADMIN_EMAIL` | *(пусто)*                                  | Если задан вместе с `ADMIN_PASSWORD`, при запуске создаётся аккаунт ADMIN |
| `ADMIN_PASSWORD` | *(пусто)*                                 | Пароль аккаунта администратора       |

Схема управляется через Hibernate (`spring.jpa.hibernate.ddl-auto=update`).

### Запуск

```bash
./mvnw spring-boot:run
```

Затем откройте http://localhost:8080 — SPA отдаётся контроллером `FrontendController`.

### Сборка

```bash
./mvnw clean package
java -jar target/PlaySlot-0.0.1-SNAPSHOT.jar
```

### Тесты

Тесты используют in-memory базу H2 (`src/test/resources/application.properties`):

```bash
./mvnw test
```

## Обзор API

Все endpoints представляют собой JSON REST API под `/api`. Для запросов с изменением данных требуются session cookie и CSRF-токен (получается через `GET /api/auth/csrf`). Полная таблица endpoints приведена выше в разделе «API Overview»: `/api/auth`, `/api/courts`, `/api/bookings`, `/api/games`, `/api/teams`, `/api/owner/...`, `/api/admin/...`, `/api/profile`, `/api/home`, `/api/health/database`.

## Доменная модель

- **User (Пользователь)** — имя, email, хешированный пароль, `UserRole` (`PLAYER`, `OWNER`, `ADMIN`)
- **Court (Площадка)** — принадлежит пользователю, вид спорта, местоположение, цена, `CourtStatus` (`PENDING`, `APPROVED`, `REJECTED`)
- **Booking (Бронирование)** — пользователь + площадка + временной слот, `BookingStatus` (`PENDING`, `CONFIRMED`, `CANCELLED`, `COMPLETED`)
- **Game (Игра)** — организованная встреча на площадке, `GameStatus` (`PENDING`, `APPROVED`, `REJECTED`), состав участников
- **Team (Команда)** — группа игроков
- **Review (Отзыв)** — оценка и отзыв о площадке

## Сборка фронтенда (необязательно)

Бандл SPA можно перегенерировать с помощью Node:

```bash
node build_app_js.js
```

Это объединяет `i18n_extracted.js` с логикой приложения и записывает результат в `src/main/resources/static/app.js`.

## Дизайн-ресурсы

Макеты UI находятся в [`docs/design/`](docs/design).
