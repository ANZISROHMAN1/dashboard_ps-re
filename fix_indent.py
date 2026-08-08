with open('generate_dashboard.py') as f:
    lines = f.read().split('\n')

out = []
in_gen = False
for l in lines:
    if l.startswith('today_str_ind'): in_gen = True
    if l.startswith('    with open("Dashboard_Lokal'): in_gen = False
    
    if in_gen and l.strip(): 
        out.append('    ' + l)
    elif in_gen: 
        out.append('')
    else: 
        out.append(l)

with open('generate_dashboard.py', 'w') as f:
    f.write('\n'.join(out))
