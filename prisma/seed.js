const fs = require('fs');
const path = require('path');
const csvParser = require('csv-parser');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const foods = [];
  // Usa o path.join para garantir que o script encontre o CSV independente de onde for rodado
  const csvPath = path.join(__dirname, 'alimentos.csv');

  console.log('⏳ Lendo o arquivo CSV...');

  // 1. Envolvemos a leitura em uma Promise para o Node.js aguardar o fim do processo
  await new Promise((resolve, reject) => {
    fs.createReadStream(csvPath)
      // 2. headers: false e skipLines: 1 -> Ignora a primeira linha (cabeçalho) para não poluir o banco
      .pipe(csvParser({ separator: ',', headers: false, skipLines: 1 }))
      .on('data', (row) => {
        const values = Object.values(row);
        
        // 3. Mapeamento corrigido
        const descricao = values[2];
        const energia = parseFloat(values[3]) || 0;
        const proteina = parseFloat(values[4]) || 0;
        const carboidrato = parseFloat(values[5]) || 0;
        const lipideos = parseFloat(values[6]) || 0;
        const fibra = parseFloat(values[7]) || 0;

        if (descricao) {
          foods.push({
            name: descricao.trim(),
            calories: energia,
            protein: proteina,
            carbs: carboidrato,
            fat: lipideos,
            fiber: fibra
          });
        }
      })
      .on('error', reject)
      .on('end', resolve);
  });

  console.log(`💾 Inserindo ${foods.length} alimentos no banco de dados (isso pode levar alguns segundos)...`);

  // 4. Substituímos o createMany (que não funciona com skipDuplicates no SQLite) pelo upsert dentro de uma transação
  await prisma.$transaction(
    foods.map((food) =>
      prisma.food.upsert({
        where: { name: food.name },
        update: {}, // Se o alimento já existir, não faz nada
        create: food, // Se não existir, cria
      })
    )
  );
  
  console.log(`✅ Importação da TACO concluída com sucesso!`);
}

main()
  .catch((e) => {
    console.error("❌ Erro no seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });