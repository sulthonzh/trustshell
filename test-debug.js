import { executeCode } from './dist/utils/executor.js';

const code = `
while (true) {
  // Infinite loop
}
`;

executeCode('/tmp/test.js', 'javascript', {
  timeout: 100,
  cwd: process.cwd()
}).then(result => {
  console.log('Result:', result);
}).catch(error => {
  console.log('Error:', error.message);
});
