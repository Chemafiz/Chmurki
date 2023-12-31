
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
    'MATCH (u:User {name: $userName})-[r:RATED]->(rest:Restaurant)<-[:RATED]-(other:User)-[r2:RATED]->(rec:Restaurant) ' +
    'WHERE NOT (u)-[:RATED]->(rec) ' +
    'WITH rec, AVG(r2.rating) as avgRating ' +
    'RETURN rec.name, avgRating ' +
    'ORDER BY avgRating DESC LIMIT 5;',
    { userName }
  );

  const recommendations = result.records.map(record => ({
    name: record.get('rec.name'),
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
  const restaurantName = req.params.restaurantName;

  const result = await session.run(
    'MATCH (r:Restaurant {name: $restaurantName}) DETACH DELETE r',
    { restaurantName }
  );

  res.send(result.summary.counters._stats);
});


app.get('/getAllUsers', async (req, res) => {
  const result = await session.run(
    'MATCH (u:User) RETURN u.name as userName'
  );

  const allUsers = result.records.map(record => ({
    name: record.get('userName')
  }));

  res.json(allUsers);
});

app.get('/getAllRestaurants', async (req, res) => {
  const result = await session.run(
    'MATCH (r:Restaurant) RETURN r.name as restaurantName'
  );

  const allRestaurants = result.records.map(record => ({
    name: record.get('restaurantName')
  }));

  res.json(allRestaurants);
});

app.get('/getTopRatedRestaurants', async (req, res) => {
  const result = await session.run(
      'MATCH (r:Restaurant)<-[rating:RATED]-() ' +
      'WITH r, COUNT(rating) as numRatings ' +
      'RETURN r.name as restaurantName, numRatings ' +
      'ORDER BY numRatings DESC LIMIT 5'
  );

  const topRatedRestaurants = result.records.map(record => ({
    name: record.get('restaurantName'),
    numRatings: record.get('numRatings')
  }));

  res.json(topRatedRestaurants);
});


app.get('/getBestRatedRestaurants', async (req, res) => {
  const result = await session.run(
    'MATCH (r:Restaurant)<-[rating:RATED]-() ' +
    'WITH r, toFloat(SUM(rating.rating)) / toFloat(COUNT(rating)) as avgRating ' +
    'RETURN r.name as restaurantName, avgRating ' +
    'ORDER BY avgRating DESC LIMIT 5;'
  );

  const topRatedRestaurants = result.records.map(record => ({
    name: record.get('restaurantName'),
    avgRating: record.get('avgRating')
  }));

  res.json(topRatedRestaurants);
});

app.get('/getRelatedUser/:userName', async (req, res) => {
  const userName = req.params.userName;

  const result = await session.run(
    'MATCH (u1:User {name: $userName})-[r1:RATED]->(rest:Restaurant)<-[r2:RATED]-(u2:User) ' +
    'WITH u1, u2, COLLECT({restaurant: rest, rating: r1.rating - r2.rating}) AS ratingsDiff ' +
    'WHERE u1 <> u2 AND SIZE(ratingsDiff) > 0 ' +
    'WITH u2, REDUCE(s = 0, diff IN ratingsDiff | s + ABS(diff.rating)) AS similarity ' +
    'RETURN u2.name AS similarUserName, similarity ' +
    'ORDER BY similarity ASC LIMIT 1;',
    { userName }
  );

  const relatedUser = result.records.map(record => ({
    name: record.get('similarUserName'),
  }))[0];

  res.json(relatedUser);
});


// Uruchomienie serweraasdasdasasddfg
app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
