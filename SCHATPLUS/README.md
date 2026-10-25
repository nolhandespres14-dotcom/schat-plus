# schat+ — web + app + Poképléx

Cette version utilise un seul projet Supabase pour les comptes, questions, réponses, IA et Poképléx.

## Inclus
- schat+ sur ordinateur, navigateur et téléphone
- application web installable via le manifeste/service worker
- comptes utilisateurs Supabase
- questions et réponses persistées dans Supabase
- synchronisation temps réel des questions/réponses
- menu gauche avec Poképléx
- réservation Poképléx dans le même backend
- espace admin séparé pour les IA, utilisateurs, questions et statistiques
- appel des IA côté serveur avec le jeton de session Supabase
- clés d'IA jamais exposées au navigateur

## Variables Vercel
- SUPABASE_URL
- SUPABASE_ANON_KEY
- OPENAI_API_KEY
- OPENAI_MODEL (facultatif)
- ANTHROPIC_API_KEY
- ANTHROPIC_MODEL (facultatif)
- GEMINI_API_KEY
- GEMINI_MODEL (facultatif)
- LLAMA_API_URL / LLAMA_API_KEY / LLAMA_MODEL (si utilisé)
- PLAISIR_API_URL / PLAISIR_API_KEY / PLAISIR_MODEL (si utilisé)

Ne mets jamais une clé `service_role` dans le navigateur.

## ChatGPT Admin

L’administration contient maintenant un onglet « ChatGPT Admin ». Il vérifie le compte dans `admin_users`, lit un contexte embarqué des fichiers du projet (sans `supabase-config.js` ni secrets) et récupère l’état live de Supabase pour analyser les demandes.

Les clés OpenAI restent uniquement dans les variables d’environnement du serveur Vercel. Le chat admin peut analyser et préparer des changements; l’application permanente de modifications de code nécessite un pont source/déploiement.


## Droits administrateurs
- Admin 1 (`nolhandespres14@gmail.com`) : ChatGPT Admin spécial, contexte projet, et actions autorisées sur les IA.
- Admin 2 (`nelson.diraddo@gmail.com`) : administration + gestion des IA.
- Admin 3 (`monsieur_d2@hotmail.com`) : administration + gestion des IA.
- Maximum : 3 administrateurs.

Le ChatGPT Admin est protégé côté serveur par le champ `can_use_chatgpt` de `admin_users`. Les clés OpenAI doivent rester dans les variables d'environnement Vercel et ne doivent jamais être placées dans le navigateur.
