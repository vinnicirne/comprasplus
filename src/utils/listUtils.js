export function calculateItemSubtotal(item) {
  const price = Number(item.price) || 0;
  const qty = Number(item.quantity) || 1;
  return price * qty;
}

export function calculateListTotals(list) {
  const items = list.items || [];
  
  // Total Gasto = Computa EXCLUSIVAMENTE os itens marcados como comprados
  const totalGasto = items.reduce((sum, item) => {
    if (item.checked) {
      return sum + calculateItemSubtotal(item);
    }
    return sum;
  }, 0);

  // Total Estimado
  const totalPrevisto = items.reduce((sum, item) => {
    return sum + calculateItemSubtotal(item);
  }, 0);

  const orcamento = Number(list.budget) || 0;
  const saldoDisponivel = orcamento - totalGasto;
  const percentualConsumido = orcamento > 0 ? (totalGasto / orcamento) * 100 : 0;

  return {
    orcamento,
    totalGasto,
    totalPrevisto,
    saldoDisponivel,
    percentualConsumido: Math.max(0, percentualConsumido)
  };
}
