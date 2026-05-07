const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const csvParser = require('csv-parser');

const prisma = new PrismaClient();

async function main() {
  const foods = [];

  fs.createReadStream('prisma/alimentos.csv')
    .pipe(csvParser({ separator: ',', headers: false })) // usa vírgula e ignora cabeçalhos
    .on('data', (row) => {
      // cada linha é um array de valores
      const values = Object.values(row);
      const categoria = values[1];
      const descricao = values[2];
      const energia = parseFloat(values[3]) || 0;
      const proteina = parseFloat(values[4]) || 0;
      const carboidrato = parseFloat(values[5]) || 0;
      const lipideos = parseFloat(values[6]) || 0;
      const fibra = parseFloat(values[7]) || 0;

      if (descricao) {
        foods.push({
          name: descricao,
          calories: energia,
          protein: proteina,
          carbs: carboidrato,
          fat: lipideos,
          fiber: fibra
        });
      }
    })
    .on('end', async () => {
      await prisma.food.createMany({ data: foods });
      console.log(`✅ Importados ${foods.length} alimentos da TACO!`);
      await prisma.$disconnect();
    });
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
