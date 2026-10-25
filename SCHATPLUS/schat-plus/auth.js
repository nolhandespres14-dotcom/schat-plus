import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../supabase-config.js';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const ADMIN_EMAIL = 'nolhandespres14@gmail.com';

const login = document.querySelector('#loginForm');
if (login) {
  login.addEventListener('submit', async (e) => {
    e.preventDefault();
    const error = document.querySelector('#error');
    error.textContent = 'Connexion…';
    const email = document.querySelector('#email').value.trim();
    const password = document.querySelector('#password').value;
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) { error.textContent = authError.message || 'Email ou mot de passe incorrect.'; return; }
    const { data: profile } = await supabase.from('profiles').select('username,role,banned').eq('id', data.user.id).single();
    if (profile?.banned) { await supabase.auth.signOut(); error.textContent = 'Ce compte est désactivé.'; return; }
    const role = profile?.role || (email.toLowerCase() === ADMIN_EMAIL ? 'admin' : 'user');
    location.href = role === 'admin' ? 'admin.html' : 'index.html';
  });
}

const register = document.querySelector('#registerForm');
if (register) {
  register.addEventListener('submit', async (e) => {
    e.preventDefault();
    const error = document.querySelector('#error');
    error.textContent = 'Création du compte…';
    const username = document.querySelector('#username').value.trim();
    const email = document.querySelector('#email').value.trim();
    const password = document.querySelector('#password').value;
    if (username.length < 2) { error.textContent = 'Le pseudo doit contenir au moins 2 caractères.'; return; }
    if (password.length < 8) { error.textContent = 'Le mot de passe doit contenir au moins 8 caractères.'; return; }
    if (email.toLowerCase() === ADMIN_EMAIL) { error.textContent = 'Cet e-mail est réservé au compte administrateur.'; return; }
    const { data, error: authError } = await supabase.auth.signUp({ email, password, options: { data: { username } } });
    if (authError) { error.textContent = authError.message; return; }
    if (!data.session) { error.textContent = 'Compte créé. Vérifie ton e-mail pour confirmer le compte.'; return; }
    location.href = 'index.html';
  });
}
