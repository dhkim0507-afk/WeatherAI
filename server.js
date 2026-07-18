import express from "express";
import OpenAI from "openai";
import "dotenv/config";

const app=express();
app.use(express.json({limit:"200kb"}));
app.use(express.static("."));

app.post("/api/briefing",async(req,res)=>{
 try{
  if(!process.env.OPENAI_API_KEY) return res.status(503).json({error:"OPENAI_API_KEY missing"});
  const client=new OpenAI({apiKey:process.env.OPENAI_API_KEY});
  const r=await client.responses.create({
   model:process.env.OPENAI_MODEL||"gpt-5-mini",
   instructions:"당신은 한국어 기상 브리핑 전문가입니다. 제공된 데이터만 사용해 3~5문장으로 요약하고, 외출 준비와 안전 팁을 포함하세요. 과장하지 마세요.",
   input:JSON.stringify(req.body)
  });
  res.json({text:r.output_text});
 }catch(e){console.error(e);res.status(500).json({error:"briefing failed"})}
});

app.listen(process.env.PORT||3000,()=>console.log("Weather AI: http://localhost:"+(process.env.PORT||3000)));
