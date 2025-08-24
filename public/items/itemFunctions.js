function customRound(num) {
  const whole = Math.floor(num);
  const decimal = (num - whole) * 100;
  if (decimal < 5) {
      return whole;
  } else if (decimal < 35) {
      return whole + 0.25;
  } else if (decimal < 65) {
      return whole + 0.5;
  } else if (decimal < 85) {
    return whole + 0.75;
  } else {
      return whole + 1;
  }
}

export function indicateProfit(buyPrice, realPrice, prLev, profits) {
  const priceProfits = profits.filter(profit => {
    const price = profit.price;
    const start = Number(profit.start);
    const end = Number(profit.end);
    return price === prLev && (realPrice >= start && realPrice <= end);
  });
  const targProfit = Number(priceProfits[0]?.proAmount);
  const price = priceProfits[0]?.price;
  let finalPrice;
  if (price !== 'Price Five') {
    finalPrice = targProfit + buyPrice;
    priceProfits.length === 0 ? finalPrice = 0 : '';
    finalPrice >= realPrice ? finalPrice = realPrice : '';
  } else {finalPrice = targProfit + realPrice;}
  if (buyPrice === 0) return 0;
  return customRound(finalPrice);
}