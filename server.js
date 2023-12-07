
const express = require('express');
const neo4j = require('neo4j-driver');
const cors = require('cors');

const app = express();
const port = 3000;

const corsOptions = {
  origin: 'http://127.0.0.1:5500',
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  optionsSuccessStatus: 200,
};

app.use(cors());

// Połączenie z bazą danych Neo4j
const driver = neo4j.driver("neo4j+s://06c62fea.databases.neo4j.io", neo4j.auth.basic("neo4j", "rMwv83M-qbKQhBG9zpz6GV4z35EIUl8jsuGGJK91wiM"));
const session = driver.session();
app.use(express.json());

// Dodanie użytkownika do bazy danych
app.post('/addUser', async (req, res) => {
  const { userName } = req.body;
  const userId = Date.now();  // Użyj Date.now() jako unikalnego ID

  const result = await session.run(
    'CREATE (:User {id: $userId, name: $userName})',
    { userId, userName }
  );

  res.send(result.summary.counters._stats);
});

// Dodanie piosenki do bazy danych
app.post('/addSong', async (req, res) => {
  const { songTitle } = req.body;
  const songId = Date.now();  // Użyj Date.now() jako unikalnego ID

  const result = await session.run(
    'CREATE (:Song {id: $songId, title: $songTitle})',
    { songId, songTitle }
  );

  res.send(result.summary.counters._stats);
});

// Ocena piosenki przez użytkownika
app.post('/rateSong', async (req, res) => {
  const { userName, songTitle, rating } = req.body;

  const result = await session.run(
    'MATCH (u:User {name: $userName}), (s:Song {title: $songTitle}) ' +
    'CREATE (u)-[:RATED {rating: toInteger($rating)}]->(s)',
    { userName, songTitle, rating }
  );

  res.send(result.summary.counters._stats);
});

// Prosta funkcja rekomendująca piosenki dla danego użytkownika
app.get('/recommendSongs/:userName', async (req, res) => {
  const userName = req.params.userName;

  const result = await session.run(
    'MATCH (u:User {name: $userName})-[r:RATED]->(s:Song)<-[:RATED]-(other:User)-[:RATED]->(rec:Song) WHERE NOT (u)-[:RATED]->(rec) RETURN rec.title, AVG(r.rating) as avgRating ORDER BY avgRating DESC LIMIT 5',
    { userName }
  );

  const recommendations = result.records.map(record => ({
    title: record.get('rec.title'),
    avgRating: record.get('avgRating')
  }));

  res.json(recommendations);
});

// Usunięcie użytkownika po nazwie
app.delete('/deleteUser/:userName', async (req, res) => {
  const userName = req.params.userName;

  const result = await session.run(
    'MATCH (u:User {name: $userName}) DETACH DELETE u',
    { userName }
  );

  res.send(result.summary.counters._stats);
});

// Usunięcie piosenki po nazwie
app.delete('/deleteSong/:songTitle', async (req, res) => {
  const songTitle = req.params.songTitle;

  const result = await session.run(
    'MATCH (s:Song {title: $songTitle}) DETACH DELETE s',
    { songTitle }
  );

  res.send(result.summary.counters._stats);
});

// Uruchomienie serwera
app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
