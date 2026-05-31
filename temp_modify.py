from pathlib import Path 
path = Path(\" "src/pages/auth/SignupPage.tsx\) 
lines = path.read_text().splitlines() 
out = [] 
injected = False 
for line in lines: 
    if \Account" ready. Redirecting to "login\ in line and not injected: 
        new_line = line.replace(\loginâ€¦\, \login…\) 
        out.append(new_line) 
