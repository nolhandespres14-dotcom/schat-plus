// Exemple de point d'entrée serveur.
// À déployer sur un backend/Edge Function et à compléter avec les SDK des modèles.
// Les clés doivent rester dans les variables d'environnement.
import express from "express";
const app=express(); app.use(express.json());
app.post("/api/ai", async (req,res)=>{
  const {ai,question}=req.body||{};
  if(!ai||!question) return res.status(400).json({error:"ai et question sont requis"});
  // Branche ici le SDK correspondant. Ne renvoie jamais la clé API au navigateur.
  return res.json({answer:`Réponse serveur de démonstration pour ${ai} : ${question}`});
});
app.listen(process.env.PORT||3000,()=>console.log("schat+ AI API prête"));
