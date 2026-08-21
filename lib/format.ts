export const money = (value: number) =>
  `Rs. ${new Intl.NumberFormat('en-NP', {
    maximumFractionDigits: 0
  }).format(value)}`;