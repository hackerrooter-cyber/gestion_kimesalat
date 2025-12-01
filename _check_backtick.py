from pathlib import Path
text = Path('app.js').read_text()
line=1
col=0
parity=0
last=None
for ch in text:
    if ch=='\n':
        line+=1
        col=0
        continue
    col+=1
    if ch=='`':
        parity ^= 1
        last=(line,col,parity)
print('parity',parity,'last',last)
