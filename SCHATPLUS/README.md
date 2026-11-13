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


## Abonnements schat+

Le catalogue comprend V1 gratuite, V2 (20 $ CA/mois), V3 Emergent (30 $ CA/mois), V4 Lovable (40 $ CA/mois) et V5 SCHAT+ MASTER (50 $ CA/mois). Les pages `abonnements.html` et `mon-abonnement.html` permettent de consulter les offres, de créer une demande et de demander une annulation.

La migration `supabase/migrations/20261112000000_subscriptions.sql` ajoute les tables et les règles RLS. Les demandes payantes restent `pending_payment` : aucune offre payante ne devient active par un simple clic. Le paiement récurrent, la confirmation par webhook et la résiliation automatique ne sont pas activés; ils nécessitent un fournisseur de paiement choisi et configuré par un adulte responsable. Les fonctionnalités exactes et les quotas des offres doivent être définis avant d'ouvrir la vente.

Le module est ajouté sur une branche de travail et ne modifie pas le dépôt Poképlex.

Le schéma principal de l’application est ajouté par `supabase/migrations/20261113000000_core_schatplus_tables.sql` : agents IA, conversations, messages, catalogue de cartes et réservations. Cette migration crée des tables neuves dans le projet Supabase schat+; elle ne modifie pas la base Poképlex d’origine et ne copie aucune donnée de réservation personnelle.

La migration `supabase/migrations/20261113000100_subscription_indexes.sql` ajoute les index et évite plusieurs demandes de paiement simultanées pour un même compte.
