import {NextRequest,NextResponse} from 'next/server';
import {Document,Packer,Paragraph,TextRun,HeadingLevel,AlignmentType,BorderStyle} from 'docx';

const section=/^(PROFESSIONAL SUMMARY|PROFESSIONAL EXPERIENCE|WORK EXPERIENCE|PROJECTS|SELECTED PROJECTS|EDUCATION|ACADEMIC BACKGROUND|SKILLS|TECHNICAL SKILLS|CERTIFICATIONS|LANGUAGES|AI-ASSISTED DEVELOPMENT METHOD|RELEVANT SKILLS FOR THIS ROLE|COMPETÊNCIAS RELEVANTES PARA ESTA VAGA|RESUMO PROFISSIONAL|EXPERIÊNCIA PROFISSIONAL|PROJETOS|FORMAÇÃO|COMPETÊNCIAS|IDIOMAS)\\s*:?$/i;
export async function POST(req:NextRequest){
 const {draft}=await req.json();
 if(typeof draft!=='string'||draft.trim().length<30||draft.length>50000)return NextResponse.json({error:'Texto inválido'},{status:400});
 const lines=draft.split(/\\r?\\n/);
 let first=true;
 const paragraphs=lines.map(line=>{
  const text=line.trim();
  if(!text)return new Paragraph({spacing:{after:70}});
  if(first){first=false;return new Paragraph({children:[new TextRun({text,bold:true,size:30,color:'183B45'})],spacing:{after:130},alignment:AlignmentType.LEFT});}
  if(section.test(text))return new Paragraph({text,heading:HeadingLevel.HEADING_2,spacing:{before:240,after:100},border:{bottom:{color:'D9E3E6',size:5,space:4,style:BorderStyle.SINGLE}}});
  return new Paragraph({children:[new TextRun({text,size:21})],spacing:{after:90},alignment:AlignmentType.LEFT});
 });
 const doc=new Document({sections:[{properties:{page:{margin:{top:900,bottom:900,left:950,right:950}}},children:paragraphs}]});
 const buffer=await Packer.toBuffer(doc);
 return new NextResponse(new Uint8Array(buffer),{headers:{'Content-Type':'application/vnd.openxmlformats-officedocument.wordprocessingml.document','Content-Disposition':'attachment; filename="curriculo-ats.docx"'}});
}
