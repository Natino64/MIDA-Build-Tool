<img width="1774" height="887" alt="MIDA Build Tool Logo" src="https://github.com/user-attachments/assets/8bf08f0e-af58-498e-a992-29123c0ec7b8" />


**MIDA Build Tool is an AI-powered Destiny 2 build optimiser that analyses a player’s existing gear and recommends, explains, and equips the best achievable build for their playstyle.**

## The Problem

Destiny 2 is an online multiplayer first-person shooter where players collect hundreds of weapons, armour pieces, and abilities to customise their character.

A **build** is the specific combination of abilities, weapons, armour, perks, and mods chosen to work together. A well-designed build can significantly improve how effectively a character performs in-game.

Creating a good build can be cumbersome. Players often find builds through YouTube, Reddit, or build websites, then have to:

- Determine whether they own the required gear
- Find those items across their characters and vault
- Compare different weapon rolls
- Identify suitable substitutions when something is missing

This process can take hours.

## The Solution

<img width="1920" height="1080" alt="20170819195154" src="https://github.com/user-attachments/assets/f834d86f-ce6e-4b09-808e-76cd2f501b99" />

**MIDA Build Tool** removes much of this manual work.

Players sign in with their Bungie account, choose a character, and describe what build they'd like in plain English.

For example:

> *"Give me a competitive 3v3 PvP build focused on sniping."*

MIDA then:

1. **Analyses the player's inventory** to understand what gear they already own.
2. **Interprets their request using AI** to understand their desired activity and playstyle.
3. **Compares available gear against curated, high-quality builds** to identify strong combinations.
4. **Recommends the best achievable loadout** using items the player actually owns.
5. **Explains the recommendation** and why the selected gear works well together.
6. **Lets the player quickly equip the build**, reducing the manual work required to put it together.

## How It Works

<img width="2855" height="1593" alt="WALLPAPER" src="https://github.com/user-attachments/assets/b66aea32-6823-41d9-b3af-5f3ef159fb10" />

**Describe what you want → MIDA analyses your gear → Get a personalised build → Equip it**

Instead of finding the theoretically best build and then discovering you're missing half of the required gear, MIDA focuses on finding the **best build you can actually make with your existing inventory**.

## Project Structure

<img width="1920" height="1080" alt="20170819195222" src="https://github.com/user-attachments/assets/26232271-701d-4eb7-ab15-45b1881df177" />

MIDA uses a monorepo structure, keeping the frontend, backend, infrastructure, build data, and documentation in a single repository while maintaining a clear separation of responsibilities.

```text
MIDA-Build-Tool/
├── frontend/
├── backend/
├── infrastructure/
├── meta-builds/
├── scripts/
├── docs/
│   └── ADRs/
└── .github/
    └── workflows/
```

### `frontend/`

The user-facing web application. Contains the UI for Bungie authentication, character selection, build prompts, and displaying recommended builds.

### `backend/`

The application backend, primarily the AWS Lambda code. Handles Bungie API integration, OpenAI requests, build recommendation logic, sessions, and database access.

### `infrastructure/`

Infrastructure-as-code used to define and deploy the AWS environment, including Lambda, API Gateway, DynamoDB, Aurora/PostgreSQL, CloudFront, S3, and IAM resources.

### `meta-builds/`

Curated Destiny 2 meta-build definitions used by the recommendation engine. Builds are stored as structured JSON and ingested into PostgreSQL with their vector embeddings.

### `scripts/`

Utility and maintenance scripts, such as validating meta-build definitions and ingesting builds and their embeddings into PostgreSQL/pgvector.

### `docs/`

Technical documentation for the project, including architecture diagrams, the SCORPS assessment, threat model, and other engineering documentation.

### `.github/workflows/`

GitHub Actions CI/CD workflows. Handles application and infrastructure deployment to AWS using OIDC, as well as triggering the meta-build ingestion pipeline when build definitions change.
