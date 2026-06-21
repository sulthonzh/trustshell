import { analyzeCode } from './dist/analyzer/analyzer.js';
import { writeFileSync, unlinkSync, mkdirSync, existsSync, rmdirSync } from 'fs';
import { join } from 'path';

const testDir = join(process.cwd(), 'test-tmp');
if (!existsSync(testDir)) {
  mkdirSync(testDir);
}

const code = `
function add(a,b){return a+b}

function veryLongFunctionWithManyIssues(){
const x=1;const y=2;const z=3;const w=4;const v=5;const u=6;
const t=7;const s=8;const r=9;const q=10;const p=11;const o=12;
const n=13;const m=14;const l=15;const k=16;const j=17;const i=18;
const h=19;const g=20;const f=21;const e=22;const d=23;const c=24;
return x+y+z+w+v+u+t+s+r+q+p+o+n+m+l+k+j+i+h+g+f+e+d+c;
}

// TODO: fix this
// FIXME: implement this
`;

const filePath = join(testDir, 'messy.js');
writeFileSync(filePath, code, 'utf8');

const result = await analyzeCode(filePath, 'javascript', {});
console.log('Score:', result.codeQuality.score);
console.log('Issue count:', result.codeQuality.issues.length);
result.codeQuality.issues.forEach((issue, idx) => {
  console.log(`${idx + 1}. [${issue.type}] ${issue.severity}: ${issue.message}`);
});

// Cleanup
unlinkSync(filePath);