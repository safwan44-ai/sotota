// Shows a whole-number Taka amount in Bengali digits, like ৳১,২০০
export function taka(n: number) {
  return "৳" + new Intl.NumberFormat("bn-BD").format(n);
}