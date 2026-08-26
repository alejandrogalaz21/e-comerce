## 🧠 Key Principle in NestJS

```txt
NestJS is organized by FEATURES (business modules), not by file type
```

## ✅ Recommended Structure
```
src/
├── app.module.ts
├── main.ts

├── config/                 # Global configuration
│   ├── env.config.ts
│   ├── database.config.ts
│   └── index.ts

├── common/                 # Reusable code
│   ├── decorators/
│   ├── filters/
│   ├── guards/
│   ├── interceptors/
│   ├── pipes/
│   ├── constants/
│   └── utils/

├── modules/                # Business features
│   ├── users/
│   │   ├── dto/
│   │   │   ├── create-user.dto.ts
│   │   │   └── update-user.dto.ts
│   │   ├── entities/
│   │   │   └── user.entity.ts
│   │   ├── users.controller.ts
│   │   ├── users.service.ts
│   │   ├── users.module.ts
│   │   └── users.repository.ts (optional)
│   │
│   ├── auth/
│   │   ├── dto/
│   │   ├── strategies/
│   │   ├── guards/
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   └── auth.module.ts
│   │
│   └── orders/
│       └── ...
│
├── database/               # Persistence layer
│   ├── migrations/
│   ├── seed/
│   └── prisma/ | typeorm/
│
└── shared/                 # (optional) shared modules
    ├── logger/
    └── mail/
```

## 🧩 How to Think About a MODULE Correctly
A module should represent a business capability.

Example users:
```txt
users/
├── dto/
├── entities/
├── users.controller.ts  # HTTP (input/output)
├── users.service.ts     # business logic
├── users.repository.ts  # data access (optional)
└── users.module.ts
```
## ❌ Giant Modules

If your module has:

- +5 controllers
- +10 services

👉 Split it

### Example:
```txt
users/
├── profile/
├── permissions/
├── settings/
└── users.module.ts
```

## 📁 Current Project Structure

```
src/
├── app.module.ts
├── main.ts

├── config/                 # Global configuration
│   ├── app.configuration.ts
│   ├── mongodb.configuration.ts
│   ├── pg.configuration.ts
│   └── index.ts

├── common/                 # Reusable utilities
│   ├── adapters/
│   ├── dto/
│   ├── interfaces/
│   ├── middleware/
│   ├── pagination/
│   └── pipes/

├── modules/                # Business features
│   ├── auth/               # Authentication
│   │   ├── dto/
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── auth.module.ts
│   │   └── jwt.strategy.ts
│   │
│   ├── users/              # User management
│   │   ├── dto/
│   │   ├── entities/
│   │   ├── users.controller.ts
│   │   ├── users.service.ts
│   │   └── users.module.ts
│   │
│   ├── orders/             # Order management
│   │   ├── dto/
│   │   ├── entities/
│   │   ├── orders.controller.ts
│   │   ├── orders.service.ts
│   │   ├── orders.repository.ts
│   │   └── orders.module.ts
│   │
│   ├── products/           # Product catalog
│   │   ├── dto/
│   │   ├── entities/
│   │   ├── products.controller.ts
│   │   ├── products.service.ts
│   │   └── products.module.ts
│   │
│   └── health/             # Health check endpoints
│       ├── health.controller.ts
│       └── health.module.ts

├── database/               # Persistence layer
│   ├── dynamodb/
│   │   ├── dynamo.base-repository.ts
│   │   ├── dynamodb-health.service.ts
│   │   └── dynamodb.module.ts
│   ├── postgres/
│   │   ├── pg-health.service.ts
│   │   └── pg.module.ts
│   └── seed/
│       ├── products.json
│       ├── seed.controller.ts
│       ├── seed.service.ts
│       └── seed.module.ts

└── shared/                 # Shared third-party integrations
    ├── google/
    │   └── sheets.service.ts
    ├── openai/
    │   ├── openai.service.ts
    │   └── openai.module.ts
    └── whatsapp/
        ├── dto/
        ├── whatsapp.service.ts
        └── whatsapp.module.ts
```