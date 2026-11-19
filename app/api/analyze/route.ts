import {NextRequest,NextResponse} from 'next/server';
import {localAnalysis,tailorResume} from '../../../lib/analysis';
export const runtime='nodejs';

export async function POST(req:NextRequest){
 try{
  const form=await req.formData();
  const file=form.get('file');
  let cv=String(form.get('cv')||'');
  const job=String(form.get('job')||'');
  const language=String(form.get('language')||'en');
  if(file instanceof File && file.size){
   if(file.size>5_000_000)return NextResponse.json({error:'Arquivo excede 5 MB.'},{status:400});
   const buf=Buffer.from(await file.arrayBuffer());
   const name=file.name.toLowerCase();
   if(name.endsWith('.docx')){const mammoth=await import('mammoth');cv=(await mammoth.extractRawText({buffer:buf})).value;}
   else if(name.endsWith('.pdf')){const pdf=(await import('pdf-parse')).default;cv=(await pdf(buf)).text;}
   else if(name.endsWith('.txt'))cv=buf.toString('utf8');
   else return NextResponse.json({error:'Envie PDF, DOCX ou TXT.'},{status:400});
  }
  if(cv.trim().length<50||job.trim().length<40)return NextResponse.json({error:'Forneça currículo e vaga com texto suficiente.'},{status:400});
  if(cv.length>40000||job.length>25000)return NextResponse.json({error:'Texto muito longo.'},{status:400});
  const result=localAnalysis(cv,job);
  const noteMatch=/^\s*APPLICATION NOTES\s*\(REMOVE AFTER VERIFICATION\)\s*$/im.exec(cv);
  const clean=noteMatch?cv.slice(0,noteMatch.index).trimEnd():cv;
  result.draft=tailorResume(clean,job,language);
  result.mode='structured';
  if(noteMatch)result.warnings.push('Notas internas de verificação removidas do rascunho. Revise antes de enviar.');
  return NextResponse.json(result);
 }catch{
  return NextResponse.json({error:'Não foi possível analisar o arquivo ou a vaga.'},{status:500});
 }
}
