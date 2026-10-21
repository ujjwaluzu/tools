# Everyday Tools

## Calculators

- Calculator
- Percentage calculator
- Age calculator
- Date difference
- Tip calculator
- GST calculator
- Loan calculator

## Time

- Timezone converter
- Unix timestamp converter
- Date/time utilities

## Other

- Unit converter
- Currency converter
- Random generator

Keep these tools extremely fast and simple.

## Behavior and assumptions

- Calculator percentages are postfix values: `50%` means `0.5`; therefore `200 × 10% = 20`. Expressions are parsed as arithmetic and never executed as JavaScript.
- Percentage change divides by the absolute original value, so negative starting values use their magnitude. A zero denominator is rejected.
- Tip uses `tip = bill × rate ÷ 100`, then total and per-person share; calculations keep full precision until display. GST is user-selected and does not prescribe a local tax rate.
- Loan results assume a fixed annual rate, monthly compounding, and payments at month end. They exclude fees, tax, and lender-specific terms.
- Date-only values are calendar dates. Adding months or years clamps to the last valid day of the target month. For age calculations, February 29 uses February 28 in non-leap years; this is a general calculator convention, not a legal-age rule.
- Timezone conversion uses runtime IANA data, rejects daylight-saving gaps, and selects the earlier instant for ambiguous wall times with a note. Unix timestamps always require an explicit seconds or milliseconds unit.
- Random integers use browser cryptographic randomness with rejection sampling. If the browser does not provide it, generation reports an error rather than silently falling back.
- Currency uses Frankfurter dated daily reference rates. Only the selected currency pair is requested; the amount stays local. Rates are indicative and may differ from bank/provider rates or lag on holidays.
