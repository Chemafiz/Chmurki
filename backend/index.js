
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
app.post('/addRestaurant', async (req, res) => {
  const { restaurantName } = req.body;
  const restaurantId = Date.now();  // Użyj Date.now() jako unikalnego ID

  const result = await session.run(
    'CREATE (:Restaurant {id: $restaurantId, name: $restaurantName})',
    { restaurantId, restaurantName}
  );

  res.send(result.summary.counters._stats);
});

// Ocena piosenki przez użytkownika
app.post('/rateRestaurant', async (req, res) => {
  const { userName, restaurantName, rating } = req.body;

  const result = await session.run(
    'MATCH (u:User {name: $userName}), (r:Restaurant {name: $restaurantName}) ' +
    'CREATE (u)-[:RATED {rating: toInteger($rating)}]->(r)',
    { userName, restaurantName, rating }
  );

  res.send(result.summary.counters._stats);
});

// Prosta funkcja rekomendująca piosenki dla danego użytkownika
app.get('/recommendRestaurant/:userName', async (req, res) => {
  const userName = req.params.userName;

  const result = await session.run(
    'MATCH (u:User {name: $userName})-[r:RATED]->(rest:Restaurant)<-[:RATED]-(other:User)-[:RATED]->(rec:Restaurant) WHERE NOT (u)-[:RATED]->(rec) RETURN rec.title, AVG(r.rating) as avgRating ORDER BY avgRating DESC LIMIT 5',
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
app.delete('/deleteRestaurant/:restaurantName', async (req, res) => {
  const songTitle = req.params.songTitle;

  const result = await session.run(
    'MATCH (r:Restaurant {title: $restaurantName}) DETACH DELETE r',
    { songTitle }
  );

  res.send(result.summary.counters._stats);
});

// Uruchomienie serwera
app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
