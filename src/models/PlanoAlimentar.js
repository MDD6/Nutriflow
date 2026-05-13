class PlanoAlimentar {
  static mapMealPlanToPlanoAlimentar(mealPlan) {
    if (!mealPlan) return null;

    // 👇 Adicionamos o (mealPlan.items || []) aqui para proteger o .map!
    const items = (mealPlan.items || []).map(item => {
      const factor = item.quantity / 100;
      const calories = item.food ? Math.round(item.food.calories * factor) : 0;
      const protein = item.food ? Math.round(item.food.protein * factor) : 0;
      const carbs = item.food ? Math.round(item.food.carbs * factor) : 0;
      const fats = item.food ? Math.round(item.food.fat * factor) : 0;
      const fiber = item.food ? Math.round(item.food.fiber * factor * 10) / 10 : 0;

      return {
        id: item.id,
        food: item.food?.name || item.name || 'Alimento desconhecido',
        mealTime: item.mealTime,
        quantity: item.quantity,
        calories,
        protein,
        carbs,
        fats,
        fiber,
      };
    });

    const totalCalories = items.reduce((sum, item) => sum + item.calories, 0);
    const totalProtein = items.reduce((sum, item) => sum + item.protein, 0);
    const totalCarbs = items.reduce((sum, item) => sum + item.carbs, 0);
    const totalFats = items.reduce((sum, item) => sum + item.fats, 0);
    const totalFiber = items.reduce((sum, item) => sum + item.fiber, 0);

    return {
      id: mealPlan.id,
      title: mealPlan.title,
      notes: mealPlan.notes,
      status: mealPlan.status,
      startDate: mealPlan.startDate,
      endDate: mealPlan.endDate,
      createdAt: mealPlan.createdAt,
      updatedAt: mealPlan.updatedAt,
      patientId: mealPlan.patientProfileId,
      patientProfileId: mealPlan.patientProfileId,
      patient: mealPlan.patientProfile?.user?.name || 'Paciente desconhecido',
      nutritionistId: mealPlan.nutritionistId,
      nutritionist: mealPlan.nutritionist?.name || 'Nutricionista desconhecido',
      calories: totalCalories,
      protein: totalProtein,
      carbs: totalCarbs,
      fats: totalFats,
      fiber: totalFiber,
      items,
    };
  }
}

module.exports = { PlanoAlimentar };