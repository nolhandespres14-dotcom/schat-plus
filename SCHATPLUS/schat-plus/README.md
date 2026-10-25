# schat+

Prototype web + PWA de schat+.

## Inclus

- Chat schat+
- Historique des questions
- Sélection d'une question puis d'une IA
- Changement d'IA sans recopier la question
- Menu gauche avec **IA** + **Poképléx**
- Écran Poképléx au milieu de schat+
- Dashboard admin
- Activation/désactivation des IA
- Ajout d'une IA dans le dashboard
- Suppression de questions
- Statistiques de prototype
- PWA installable

## Lancer

Ouvre `index.html` dans un navigateur pour tester l'interface.

Pour une PWA complète, utilise un petit serveur local (par exemple `python3 -m http.server 8000`) puis ouvre `http://localhost:8000/`.

## Important

Cette livraison est un **prototype fonctionnel côté navigateur**. Les vraies connexions aux API d'IA, l'authentification sécurisée, les rôles admin et la base de données doivent être branchés côté serveur/Supabase avant une mise en production.

Le mot de passe administrateur n'est volontairement pas écrit dans les fichiers : un mot de passe en clair dans le frontend serait visible par tout le monde.


## Version actuelle
- Connexion utilisateur/admin avec session locale de prototype.
- Configuration du mot de passe admin depuis la page de connexion.
- Protection de navigation des pages user/admin.
- Déconnexion.
- Poképléx conservé dans le menu et bouton relié au site Poképléx.
- Administration des IA (activer/désactiver/ajouter).

Important : cette version est un prototype front-end. Pour une vraie sécurité, les comptes, mots de passe et permissions doivent être gérés côté serveur/Supabase, jamais seulement dans localStorage.
