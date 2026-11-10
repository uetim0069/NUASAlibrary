const P=require('/home/claude/pjwork/site/pj-study.js'), D=require('/home/claude/pjwork/site/pj-doc.js'), T=require('./test_bp.js'), fs=require('fs');
const bp=P.sanitizeBp(T.survey), S=P.buildStudy(bp,{population:65});
const para=(n)=>Array.from({length:n},(_,i)=>"The broadcasting industry occupies a strategic position in the socio-economic development of any nation, serving as a medium for information, education, entertainment and advertising. In Nigeria, the sector has grown from a government-controlled monopoly into a competitive industry made up of public and private stations that compete for audience attention and advertising revenue.").join("\n\n");
let md=[
P.titlePage(bp,{details:{name:'Jane Doe',regNo:'20/AC/001',supervisor:'Prof. A. B. Udoh',monthYear:'October 2026'}}),
"[[CT]] ABSTRACT", para(2), "[[PB]]",
"[[CH]] CHAPTER ONE","[[CT]] INTRODUCTION",
"[[H2]] 1.1 Background to the Study", para(3),
"[[H2]] 1.3 Objectives of the Study","The main objective of this study is to examine the relationship between overhead costing and profitability. Specifically, the study intends to achieve the following objectives; to:",
"[[LI]] i. determine the relationship between the method of overhead cost allocation and profitability;","[[LI]] ii. assess the relationship between the control of administrative overheads and profitability;",
"[[H2]] 1.8 Operational Definition of Key Concepts","[[LI]] a. **Activity-Based Costing (ABC):** A costing method that assigns overheads to activities and then to products. Operationally, it refers to the use of cost drivers at the station.",
"[[CH]] CHAPTER TWO","[[CT]] REVIEW OF RELATED LITERATURE",
"[[H2]] 2.2 Theoretical Framework","[[H3]] 2.2.1 Activity-Based Costing (ABC) Theory", para(1), "The key tenets of the theory include:","[[LI]] 1. **Activities cause costs:** Resources are consumed by activities, not by products.",
"[[TC]] Table 2.1: Summary of Empirical Review","[[TB open w=6,22,28,44 split=4]]","S/N | Author | Methodology | Findings",
...Array.from({length:9},(_,i)=>`${i+1} | Author${i+1} (20${10+i}) | Survey of ${40+i} firms using questionnaires and regression | Overhead allocation significantly affected profitability and pricing decisions in the firms studied.`),"[[/TB]]","[[TS]] Source: Researcher’s compilation (2026).",
"[[CH]] CHAPTER THREE","[[CT]] METHODOLOGY",
"[[H2]] 3.5 Sample Size and Sampling Technique","The Taro Yamane formula was adopted:","[[EQ]] "+S.taro.formula,"[[EQ]] "+S.taro.calc,
S.tables.T3_VAR,S.tables.T3_SAMPLE,
"[[CH]] CHAPTER FOUR","[[CT]] DATA PRESENTATION, ANALYSIS AND INTERPRETATION OF RESULTS",
"[[H2]] 4.2 Presentation of Questionnaire Return Rate",S.tables.T4_RETURN,S.tables.T4_IV1,S.tables.T4_CHI1,
"[[PB]]","[[CT]] REFERENCES","[[RF]] Cooper, R., & Kaplan, R. S. (1988). Measure costs right: Make the right decisions. __Harvard Business Review, 66__(5), 96, 103.",
P.appendix(bp,S)].join("\n\n");
fs.writeFileSync('sample.md',md);
const blocks=D.parse(D.clean(md));
console.log('blocks',blocks.length, blocks.filter(b=>b.t==='tb').length+' tables');
const blob=D.toDocx(blocks,{title:bp.title});
blob.arrayBuffer().then(ab=>{fs.writeFileSync('sample.docx',Buffer.from(ab));console.log('docx bytes',ab.byteLength);});
