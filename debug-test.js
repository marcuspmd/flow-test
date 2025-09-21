// Teste para verificar o que está acontecendo com os tipos
const obj = {
  timestamp: 1758464617833,
  calculated_value: 50
};

console.log("Objeto original:", obj);
console.log("Tipos originais:", typeof obj.timestamp, typeof obj.calculated_value);

const jsonString = JSON.stringify(obj);
console.log("JSON string:", jsonString);

const parsedBack = JSON.parse(jsonString);
console.log("Depois de parse:", parsedBack);
console.log("Tipos depois de parse:", typeof parsedBack.timestamp, typeof parsedBack.calculated_value);