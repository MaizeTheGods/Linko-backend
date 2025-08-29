import express from 'express';
const app = express();

app.get('/', (req, res) => {
  res.send('Minimal server working');
});

app.listen(3000, () => {
  console.log('Minimal server running on port 3000');
});
