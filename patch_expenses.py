#!/usr/bin/env python3
"""
patch_expenses.py — applies the 5 approved Expenses-tab edits to app.js:
  1. fetch 500 confirmed rows instead of 20 (so pagination has data)
  2. Recent-expenses card: drop the chart canvas, add a pager container
  3. wire the pager into renderExpensesTab, drop the old handler call there
  4. add EXPENSE_PAGE_SIZE + paging state + renderExpenseRecentPage()
  5. remove the now-redundant recent category bar chart

SAFE BY DESIGN: every edit's search text must appear EXACTLY ONCE. If any
target is missing or appears more than once, the script aborts and writes
nothing — it will never partially corrupt the file. A .bak backup is made.

Usage (run from the repo root, where app.js lives):
    python3 patch_expenses.py
"""

import sys, os, shutil

PATH = "app.js"

# (label, find, replace).  find must match once, verbatim.
EDITS = [
    (
        "Edit 1 — fetch 500 confirmed rows",
        "    safeQuery(sb.from('expense_log').select('*').eq('status', 'confirmed').order('expense_date', { ascending: false }).limit(20)),",
        "    safeQuery(sb.from('expense_log').select('*').eq('status', 'confirmed').order('expense_date', { ascending: false }).limit(500)),",
    ),
    (
        "Edit 2 — Recent card: drop canvas, add pager container",
        "      ${recentRows.length ? '<div class=\"chart-wrap-sm\"><canvas id=\"expense-recent-chart\"></canvas></div>' : ''}\n"
        "      <div id=\"expense-recent-list\" style=\"margin-top:10px;\">\n"
        "        ${recentRows.length ? recentRows.map(r => renderExpenseRow(r)).join('') : '<p class=\"empty-state\">No confirmed expenses yet.</p>'}\n"
        "      </div>",
        "      <div id=\"expense-recent-list\" style=\"margin-top:10px;\"></div>\n"
        "      <div id=\"expense-recent-pager\" style=\"display:flex;align-items:center;justify-content:center;gap:12px;margin-top:12px;\"></div>",
    ),
    (
        "Edit 3 — wire pager into renderExpensesTab, drop old handler call",
        "  renderExpenseCharts(categoryRows, allCategoryRows, recentRows);\n"
        "  attachExpenseAddHandlers();\n"
        "  attachRecentExpenseHandlers(recentRows);\n"
        "}",
        "  expenseRecentRows = recentRows;\n"
        "  expenseRecentPage = 0;\n"
        "  renderExpenseRecentPage();\n\n"
        "  renderExpenseCharts(categoryRows, allCategoryRows, recentRows);\n"
        "  attachExpenseAddHandlers();\n"
        "}",
    ),
    (
        "Edit 4 — add paging state + renderExpenseRecentPage()",
        "// Edit button on any already-logged (confirmed) expense — reuses the same\n"
        "// correction form/flow as the review queue's \"Correct\" action: inserts a\n"
        "// new corrected row with corrects_id, marks the original superseded. No\n"
        "// direct edit of amount/vendor/category ever happens on an existing row.\n"
        "function attachRecentExpenseHandlers(recentRows) {",
        "const EXPENSE_PAGE_SIZE = 10;\n"
        "let expenseRecentRows = [];\n"
        "let expenseRecentPage = 0;\n\n"
        "// Renders one page (10) of confirmed expenses into #expense-recent-list and\n"
        "// draws the pager. Re-binds row edit handlers each turn since the rows are\n"
        "// re-created. Full list stays in expenseRecentRows so edit lookups by id work\n"
        "// regardless of which page is visible.\n"
        "function renderExpenseRecentPage() {\n"
        "  const listEl = document.getElementById('expense-recent-list');\n"
        "  const pagerEl = document.getElementById('expense-recent-pager');\n"
        "  if (!listEl) return;\n\n"
        "  const total = expenseRecentRows.length;\n"
        "  if (!total) {\n"
        "    listEl.innerHTML = '<p class=\"empty-state\">No confirmed expenses yet.</p>';\n"
        "    if (pagerEl) pagerEl.innerHTML = '';\n"
        "    return;\n"
        "  }\n\n"
        "  const pageCount = Math.ceil(total / EXPENSE_PAGE_SIZE);\n"
        "  if (expenseRecentPage > pageCount - 1) expenseRecentPage = pageCount - 1;\n"
        "  if (expenseRecentPage < 0) expenseRecentPage = 0;\n\n"
        "  const start = expenseRecentPage * EXPENSE_PAGE_SIZE;\n"
        "  const pageRows = expenseRecentRows.slice(start, start + EXPENSE_PAGE_SIZE);\n"
        "  listEl.innerHTML = pageRows.map(r => renderExpenseRow(r)).join('');\n\n"
        "  if (pagerEl) {\n"
        "    pagerEl.innerHTML = pageCount > 1 ? `\n"
        "      <button type=\"button\" class=\"btn-secondary\" id=\"expense-recent-prev\" ${expenseRecentPage === 0 ? 'disabled' : ''} style=\"background:var(--bg3);color:var(--text2);\">\u2190 Prev</button>\n"
        "      <span style=\"font-size:11px;color:var(--text4);\">Page ${expenseRecentPage + 1} of ${pageCount}</span>\n"
        "      <button type=\"button\" class=\"btn-secondary\" id=\"expense-recent-next\" ${expenseRecentPage >= pageCount - 1 ? 'disabled' : ''} style=\"background:var(--bg3);color:var(--text2);\">Next \u2192</button>\n"
        "    ` : '';\n"
        "    const prevBtn = document.getElementById('expense-recent-prev');\n"
        "    const nextBtn = document.getElementById('expense-recent-next');\n"
        "    if (prevBtn) prevBtn.addEventListener('click', () => { expenseRecentPage--; renderExpenseRecentPage(); });\n"
        "    if (nextBtn) nextBtn.addEventListener('click', () => { expenseRecentPage++; renderExpenseRecentPage(); });\n"
        "  }\n\n"
        "  attachRecentExpenseHandlers(expenseRecentRows);\n"
        "}\n\n"
        "// Edit button on any already-logged (confirmed) expense — reuses the same\n"
        "// correction form/flow as the review queue's \"Correct\" action: inserts a\n"
        "// new corrected row with corrects_id, marks the original superseded. No\n"
        "// direct edit of amount/vendor/category ever happens on an existing row.\n"
        "function attachRecentExpenseHandlers(recentRows) {",
    ),
    (
        "Edit 5 — remove the redundant recent category bar chart",
        "\n  // One bar per category (summed across the recent transactions), not one\n"
        "  // bar per individual transaction.\n"
        "  const recentEl = document.getElementById('expense-recent-chart');\n"
        "  if (recentEl && recentRows && recentRows.length) {\n"
        "    const totalsByCategory = {};\n"
        "    recentRows.forEach(r => {\n"
        "      const cat = r.category || 'Uncategorized';\n"
        "      totalsByCategory[cat] = (totalsByCategory[cat] || 0) + Number(r.amount || 0);\n"
        "    });\n"
        "    const categories = Object.keys(totalsByCategory).sort((a, b) => totalsByCategory[b] - totalsByCategory[a]);\n\n"
        "    EXPENSE_CHARTS.recent = new Chart(recentEl, {\n"
        "      type: 'bar',\n"
        "      data: {\n"
        "        labels: categories,\n"
        "        datasets: [{\n"
        "          data: categories.map(c => totalsByCategory[c]),\n"
        "          backgroundColor: categories.map(c => CATEGORY_COLORS[c] || '#888888'),\n"
        "          borderRadius: 4,\n"
        "        }]\n"
        "      },\n"
        "      options: {\n"
        "        plugins: {\n"
        "          legend: { display: false },\n"
        "          tooltip: { callbacks: { label: ctx => `$${ctx.parsed.y.toLocaleString(undefined, { maximumFractionDigits: 2 })}` } }\n"
        "        },\n"
        "        scales: {\n"
        "          x: { ticks: { color: textColor, font: { size: 10 } }, grid: { display: false } },\n"
        "          y: { ticks: { color: textColor, font: { size: 10 }, callback: v => '$' + v }, grid: { color: gridColor } }\n"
        "        },\n"
        "        responsive: true, maintainAspectRatio: false\n"
        "      }\n"
        "    });\n"
        "  }\n",
        "\n",
    ),
]


def main():
    if not os.path.exists(PATH):
        sys.exit(f"ERROR: {PATH} not found. Run this from the repo root (where app.js lives).")

    with open(PATH, "r", encoding="utf-8") as f:
        src = f.read()

    # Pre-flight: verify every anchor matches EXACTLY ONCE before changing anything.
    for label, find, _ in EDITS:
        n = src.count(find)
        if n != 1:
            sys.exit(
                f"ABORT: {label}\n"
                f"  expected its target text exactly once, found {n} times.\n"
                f"  Nothing was written. Your file is unchanged.\n"
                f"  (This usually means app.js already differs from the reviewed version — "
                f"tell Claude and paste the affected section.)"
            )

    # All anchors good — back up, then apply.
    shutil.copyfile(PATH, PATH + ".bak")
    out = src
    for label, find, replace in EDITS:
        out = out.replace(find, replace, 1)
        print(f"  applied: {label}")

    with open(PATH, "w", encoding="utf-8") as f:
        f.write(out)

    print(f"\nDone. Backup saved as {PATH}.bak")
    print("Next: `node --check app.js` (optional), then commit + push.")


if __name__ == "__main__":
    main()
