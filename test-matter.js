const matter = require('gray-matter');
console.log(matter.stringify('', { progress: 10, status: 'planned', customKey: 'hello' }).trim());
