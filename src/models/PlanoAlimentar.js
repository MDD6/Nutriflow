function mapMealPlanToPlanoAlimentar(mealPlan) {
  if (!mealPlan) {
    return null;
  }

  return {
    id: mealPlan.id,
    patientProfileId: mealPlan.patientProfileId,
    nutritionistId: mealPlan.nutritionistId,
    title: mealPlan.title,
    startDate: mealPlan.startDate,
    endDate: mealPlan.endDate,
    calories: mealPlan.calories,
    protein: mealPlan.protein,
    carbs: mealPlan.carbs,
    fats: mealPlan.fats,
    notes: mealPlan.notes,
    status: mealPlan.status,
    createdAt: mealPlan.createdAt,
    updatedAt: mealPlan.updatedAt,
    items: (mealPlan.items || []).map((item) => ({
      id: item.id,
      foodId: item.foodId,
      quantity: item.quantity,
      mealTime: item.mealTime,
      food: item.food ? {
        id: item.food.id,
        name: item.food.name,
        calories: item.food.calories,
        protein: item.food.protein,
        carbs: item.food.carbs,
        fat: item.food.fat,
      } : null,
    })),
  };
}

module.exports = {
  mapMealPlanToPlanoAlimentar,
};
