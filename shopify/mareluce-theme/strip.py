import json,re,os
TR="/root/.claude/projects/-home-user-HOG/6650ce74-04e9-5f1d-8299-a4ca8eda8da4/tool-results"
cache={}
def add_schema(name,content):
    m=re.search(r"{%-?\s*schema\s*-?%}(.*?){%-?\s*endschema\s*-?%}",content,re.S)
    if not m: return
    try: j=json.loads(m.group(1))
    except Exception: return
    kind,typ=name.split("/",1); typ=typ.replace(".liquid","")
    cache[(kind,typ)]={st["id"]:st["default"] for st in j.get("settings",[]) if "id" in st and "default" in st}
for fn in ["mcp-Shopify-graphql_query-1788774353223.txt","mcp-Shopify-graphql_query-1788774677061.txt","mcp-Shopify-graphql_query-1788774675949.txt"]:
    d=json.load(open(os.path.join(TR,fn)))
    for n in d["data"]["theme"]["files"]["nodes"]:
        if n["filename"].endswith(".liquid"): add_schema(n["filename"],n["body"]["content"])
def defaults(kind,typ): return cache.get((kind,typ),{})
def strip_block(b):
    d=defaults("blocks",b["type"]); s=b.get("settings",{})
    b["settings"]={k:v for k,v in s.items() if not (k in d and d[k]==v)}
    for cb in b.get("blocks",{}).values(): strip_block(cb)
    if b.get("blocks")=={}: b.pop("blocks",None)
    if "name" in b and str(b["name"]).startswith("t:"): b.pop("name")
def strip_section(sec):
    d=defaults("sections",sec["type"]); s=sec.get("settings",{})
    sec["settings"]={k:v for k,v in s.items() if not (k in d and d[k]==v)}
    for b in sec.get("blocks",{}).values(): strip_block(b)
for src,dst in [("index.json","lean-index.json"),("header-group.json","lean-header-group.json"),("footer-group.json","lean-footer-group.json")]:
    j=json.load(open(src))
    for sec in j["sections"].values(): strip_section(sec)
    s=json.dumps(j,separators=(",",":"),ensure_ascii=False)
    s=s.replace('"padding-block-start":120','"padding-block-start":96').replace('"icon":"star","width":10','"icon":"star","width":12').replace('"unit":"pixel","pixel_height":26,"unit_mobile":"pixel","pixel_height_mobile":26','"unit":"pixel","pixel_height":32')
    open(dst,"w").write(s); print(dst,len(s))
