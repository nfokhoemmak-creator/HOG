import json
BG="#F7F6F2"; INK="#14343A"; SOFT="#5C6F73"; HAIR="#E1E0DA"; CORAL="#E58C74"; PEACH="#F7D9CC"; DEEP="#1F3F47"
PAD0={"padding-block-start":0,"padding-block-end":0,"padding-inline-start":0,"padding-inline-end":0}
def text(html,preset="rte",color=None,width="100%",max_width="normal",align="left",**kw):
    s={"text":html,"width":width,"max_width":max_width,"alignment":align,"type_preset":preset,"font":"var(--font-body--family)","font_size":"1rem","line_height":"normal","letter_spacing":"normal","case":"none","wrap":"pretty","background":False,"background_color":"#00000026","corner_radius":0,**PAD0}
    if color: s["text_color"]=color
    s.update(kw)
    return {"type":"text","settings":s,"blocks":{}}
def button(label,link,style="button",bg=None,fg=None,border=None,link_color=None):
    s={"label":label,"link":link,"open_in_new_tab":False,"style_class":style,"width":"fit-content","custom_width":100,"width_mobile":"fit-content","custom_width_mobile":100}
    if style=="button-custom": s.update({"custom_button_background":bg,"custom_button_text":fg,"custom_button_border":border})
    if link_color: s["link_text_color"]=link_color
    return {"type":"button","settings":s,"blocks":{}}
def group(blocks,direction="column",gap=12,width="fill",halign="flex-start",valign="center",bg=None,vertical_on_mobile=True,**kw):
    s={"content_direction":direction,"vertical_on_mobile":vertical_on_mobile,"horizontal_alignment":halign if direction=="row" else "flex-start","vertical_alignment":valign if direction=="row" else "center","align_baseline":False,"horizontal_alignment_flex_direction_column":halign if direction=="column" else "flex-start","vertical_alignment_flex_direction_column":valign if direction=="column" else "center","gap":gap,"width":width,"custom_width":100,"width_mobile":"fill","custom_width_mobile":100,"height":"fit","custom_height":100,"background_media":"none","video_position":"cover","background_image_position":"cover","toggle_overlay":False,"overlay_color":"#00000026","overlay_style":"solid","gradient_direction":"to top","border":"none","border_width":1,"border_opacity":100,"border_radius":0,"open_in_new_tab":False,**PAD0}
    if bg: s["background_color"]=bg
    s.update(kw)
    return {"type":"group","settings":s,"blocks":dict(blocks),"block_order":list(blocks.keys())}
def video(file,alt):
    return {"type":"video","settings":{"source":"uploaded","video":file,"video_autoplay":True,"video_loop":True,"alt":alt,"custom_width":100,"custom_width_mobile":100,"aspect_ratio":"1/1","border":"none","border_width":1,"border_opacity":100,"border_radius":4,**PAD0},"blocks":{}}
def icon(name,width=28,color=CORAL):
    return {"type":"icon","settings":{"icon":name,"width":width,"link":"","open_in_new_tab":False,"icon_color":color},"blocks":{}}
def section_settings(bg=BG,direction="column",gap=24,pad=(64,64),width="page-width",**kw):
    s={"content_direction":direction,"vertical_on_mobile":True,"horizontal_alignment":"flex-start","vertical_alignment":"flex-start","align_baseline":False,"horizontal_alignment_flex_direction_column":"flex-start","vertical_alignment_flex_direction_column":"center","gap":gap,"section_width":width,"section_height":"","section_height_custom":50,"background_media":"none","background_color":bg,"video_position":"cover","background_image_position":"cover","toggle_overlay":False,"overlay_color":"#00000026","overlay_style":"solid","gradient_direction":"to top","border":"none","border_width":1,"border_opacity":100,"border_radius":0,"padding-block-start":pad[0],"padding-block-end":pad[1]}
    s.update(kw); return s

SHOP="https://cq5c0n-n2.myshopify.com"
sections={}; order=[]
def add(key,sec): sections[key]=sec; order.append(key)

# 1 HERO
hero_blocks={
 "eyebrow":text("<p>Mareluce. Occasion and holiday dresses.</p>","h6",PEACH,max_width="normal"),
 "title":text("<h1>Dressed for the golden hour.</h1>","h1",BG,max_width="narrow"),
 "sub":text("<p>Satin, lace and knit for the evenings that matter, chosen for how they move in the last light of the day.</p>","paragraph",BG,max_width="narrow",**{"padding-block-end":8}),
 "ctas":group({"shop":button("Shop dresses","shopify://collections/dresses","button-custom",CORAL,INK,CORAL),"film":button("Watch the film","#film","button-custom","rgba(0,0,0,0)",BG,BG)},direction="row",gap=12,width="fit-content",vertical_on_mobile=False),
}
add("hero",{"type":"hero","blocks":hero_blocks,"block_order":list(hero_blocks.keys()),"name":"Hero film","settings":{"media_type_1":"video","video_1":"shopify://files/videos/mareluce-hero-juliette.mp4","media_type_2":"image","stack_media_on_mobile":False,"custom_mobile_media":False,"media_type_1_mobile":"image","media_type_2_mobile":"image","link":"","open_in_new_tab":False,"content_direction":"column","vertical_on_mobile":True,"horizontal_alignment":"flex-start","vertical_alignment":"center","align_baseline":False,"horizontal_alignment_flex_direction_column":"flex-start","vertical_alignment_flex_direction_column":"flex-end","gap":16,"section_width":"full-width","section_height":"large","section_height_custom":50,"background_color":INK,"toggle_overlay":True,"overlay_color":"#14343A8C","overlay_style":"gradient","gradient_direction":"to top","blurred_reflection":False,"reflection_opacity":75,"padding-block-start":120,"padding-block-end":56}})

# 2 NEW IN product list
pl_text=lambda html,preset,**kw:{"type":"_product-list-text","settings":{"text":html,"width":"100%","max_width":kw.pop("max_width","normal"),"alignment":"left","type_preset":preset,"font":"var(--font-body--family)","line_height":"normal","letter_spacing":"normal","case":"none","wrap":"pretty","background":False,"background_color":"#00000026","corner_radius":0,**PAD0,**kw},"blocks":{}}
header_blocks={"eyebrow":pl_text("<p>New in</p>","h6"),"heading":pl_text("<h2>Eight to start with.</h2>","h2"),"body":pl_text("<p>Shown in the makers' own photographs, with the full size run and measurements on every product page, so you can order the way you would in a fitting room.</p>","paragraph",max_width="narrow"),"cta":{"type":"_product-list-button","settings":{"label":"View all styles","open_in_new_tab":False,"style_class":"button-unstyled","width":"fit-content","custom_width":100,"width_mobile":"fit-content","custom_width_mobile":100},"blocks":{}}}
card_blocks={"product-card-gallery":{"type":"_product-card-gallery","name":"t:names.product_card_media","settings":{"image_ratio":"portrait","border":"none","border_width":1,"border_opacity":100,"border_radius":0,**PAD0},"blocks":{}},
 "product_title":{"type":"product-title","name":"t:names.product_title","settings":{"width":"100%","max_width":"normal","alignment":"left","type_preset":"paragraph","font":"var(--font-body--family)","font_size":"1rem","line_height":"normal","letter_spacing":"normal","case":"none","wrap":"pretty","background":False,"background_color":"#00000026","corner_radius":0,"padding-block-start":6,"padding-block-end":0,"padding-inline-start":0,"padding-inline-end":0},"blocks":{}},
 "price":{"type":"price","name":"t:names.product_price","settings":{"show_sale_price_first":True,"show_installments":False,"show_tax_info":False,"type_preset":"paragraph","width":"100%","alignment":"left","font":"var(--font-body--family)","font_size":"1rem","line_height":"normal","letter_spacing":"normal","case":"none","text_color":SOFT,**PAD0},"blocks":{}},
 "swatches":{"type":"swatches","settings":{"product_swatches_alignment":"flex-start","product_swatches_alignment_mobile":"flex-start","hide_padding":False,"product_swatches_padding_top":6,"product_swatches_padding_bottom":0,"product_swatches_padding_left":0,"product_swatches_padding_right":0},"blocks":{}}}
add("new-in",{"type":"product-list","blocks":{
 "static-header":{"type":"_product-list-content","name":"t:names.header","static":True,"settings":{"content_direction":"column","vertical_on_mobile":True,"horizontal_alignment":"flex-start","vertical_alignment":"center","align_baseline":False,"horizontal_alignment_flex_direction_column":"flex-start","vertical_alignment_flex_direction_column":"center","gap":8,"width":"fill","custom_width":100,"width_mobile":"fill","custom_width_mobile":100,"height":"fit","custom_height":100,"background_media":"none","video_position":"cover","background_image_position":"cover","border":"none","border_width":1,"border_opacity":100,"border_radius":0,**PAD0},"blocks":header_blocks,"block_order":list(header_blocks.keys())},
 "static-product-card":{"type":"_product-card","name":"t:names.product_card","static":True,"settings":{"product_card_gap":6,"border":"none","border_width":1,"border_opacity":100,"border_radius":0,**PAD0},"blocks":card_blocks,"block_order":list(card_blocks.keys())}},
 "block_order":[],"name":"New in","settings":{"collection":"all-styles","layout_type":"grid","carousel_on_mobile":False,"max_products":8,"columns":4,"mobile_columns":"2","mobile_card_size":"60cqw","columns_gap":16,"rows_gap":36,"icons_style":"arrow","icons_shape":"none","section_width":"page-width","horizontal_alignment":"flex-start","gap":32,"background_color":BG,"padding-block-start":72,"padding-block-end":48}})

# 3 COLLECTIONS
def coll_list(key,name,handles,heading_blocks,columns,mobile_cols,pad):
    hb=group(heading_blocks,gap=8)
    return {"type":"collection-list","blocks":{"header":hb,"static-collection-card":{"type":"_collection-card","name":"t:names.collection_card","static":True,"settings":{"placement":"below_image","horizontal_alignment":"flex-start","vertical_alignment":"flex-end","collection_card_gap":10,"border":"none","border_width":1,"border_opacity":100,"border_radius":0},"blocks":{"collection-card-image":{"type":"_collection-card-image","name":"t:names.collection_card_image","static":True,"settings":{"image_ratio":"portrait","toggle_overlay":False,"overlay_color":"#00000026","overlay_style":"solid","gradient_direction":"to top","border":"none","border_width":1,"border_opacity":100,"border_radius":0}},"collection-title":{"type":"collection-title","name":"t:names.collection_title","settings":{"type_preset":"h4","font":"var(--font-heading--family)","font_size":"","line_height":"normal","letter_spacing":"normal","case":"none","wrap":"pretty","width":"fit-content","max_width":"normal","alignment":"left","background":False,"background_color":"#ffffff",**PAD0}}},"block_order":["collection-title"]}},"block_order":["header"],"name":name,"settings":{"collection_list":handles,"layout_type":"grid","carousel_on_mobile":False,"columns":columns,"mobile_columns":mobile_cols,"mobile_card_size":"60cqw","columns_gap":16,"bento_gap":8,"rows_gap":24,"max_collections":4,"icons_style":"arrow","icons_shape":"none","section_width":"page-width","gap":28,"background_color":BG,"padding-block-start":pad[0],"padding-block-end":pad[1]}}
add("collections",coll_list("collections","Shop by collection",["dresses","sets","knits-and-trousers","boots-and-accessories"],{"eyebrow":text("<p>Collections</p>","h6"),"heading":text("<h2>Shop by the evening you have in mind.</h2>","h2",max_width="narrow"),"body":text("<p>Dresses for the table, sets for the terrace, knits for the walk back. Boots, sunglasses, a ring and a gloss to finish.</p>","paragraph",max_width="narrow")},4,"2",(48,72)))

# 4 FILM
def clip(key,file,alt,caption,label,link):
    return group({"video":video(file,alt),"caption":text(caption,"paragraph",BG),"cta":button(label,link,"button-custom","rgba(0,0,0,0)",BG,BG)},gap=12)
film_blocks={
 "anchor":{"type":"custom-liquid","settings":{"custom_liquid":"<span id=\"film\" aria-hidden=\"true\"></span>"},"blocks":{}},
 "head":group({"eyebrow":text("<p>The film</p>","h6",PEACH),"heading":text("<h2>The Juliette and the Nova, in motion.</h2>","h2",BG,max_width="narrow"),"body":text("<p>Short motion studies made from the product photographs on each listing, so you can see how the cowl drapes and how the cable knit takes the light. Check the photographs on the product page before you order.</p>","paragraph",BG,max_width="narrow")},gap=8),
 "clips":group({"juliette":clip("j","shopify://files/videos/mareluce-film-juliette.mp4","The Juliette cowl neckline draping as the camera closes in","<p>The Juliette cowl-neck halter maxi. Watch the neckline settle as the camera closes in.</p>","See the Juliette","shopify://products/swinging-collar-dress"),"nova":clip("n","shopify://files/videos/mareluce-film-nova.mp4","The Nova cable-knit quarter-zip catching the light","<p>The Nova cable-knit quarter-zip, in seven colours. See how the cable takes the light.</p>","See the Nova","shopify://products/new-trendy-womens-zipper-top")},direction="row",gap=24,valign="flex-start"),
 "cta":button("Shop all dresses","shopify://collections/dresses","button-custom",CORAL,INK,CORAL)}
add("film",{"type":"section","blocks":film_blocks,"block_order":list(film_blocks.keys()),"name":"The film","settings":section_settings(bg=INK,gap=32,pad=(80,80))})

# 5 FACTS marquee
facts=["Free shipping on orders over $120","Ships to 41 countries","Secure Shopify checkout","Sizing help by email before you order","Same pieces, new name"]
mb={}
for i,f in enumerate(facts):
    mb[f"t{i}"]={"type":"text","settings":{"text":f"<p>{f}</p>","width":"fit-content","max_width":"none","alignment":"left","type_preset":"custom","font":"var(--font-subheading--family)","font_size":"0.875rem","line_height":"normal","letter_spacing":"loose","case":"uppercase","wrap":"nowrap","text_color":INK,"background":False,"background_color":"#00000026","corner_radius":0,**PAD0},"blocks":{}}
    mb[f"i{i}"]=icon("star",10,INK)
add("facts",{"type":"marquee","blocks":mb,"block_order":list(mb.keys()),"name":"Facts","settings":{"movement_direction":"normal","background_color":CORAL,"padding-block-start":14,"padding-block-end":14,"gap_between_elements":40}})

# 6 STORY
story_ps=["Mareluce began with a question we kept asking each other: what do you wear into that last hour of light, when the day is done and the evening has not decided what it is yet? Most of what we found either cost more than the evening or looked cheaper than it. We wanted the narrow middle: pieces that look the part at a price that does not need an occasion.","Every style is chosen from partner suppliers with that hour in mind: the fall of a satin slip, the way a cowl neck settles, the weight of a wool-blend knit when the evening turns cool. We keep the pieces that earn their place, and we list the size run and measurements on every product page.","Mareluce is the new name for Jamálati. Same pieces, same inbox answering your messages. We curate rather than make, and we would rather tell you where an order ships from than let you find out later."]
story_blocks={"image":{"type":"image","settings":{"image":"shopify://shop_images/mareluce-hero-juliette-poster.png","link":"shopify://products/swinging-collar-dress","image_ratio":"portrait","width":"fill","custom_width":100,"width_mobile":"fill","custom_width_mobile":100,"height":"fit","border":"none","border_width":1,"border_opacity":100,"border_radius":4,**PAD0},"blocks":{}},
 "copy":group({"eyebrow":text("<p>Our story</p>","h6"),"heading":text("<h2>We started with the hour, not the dress.</h2>","h2",max_width="narrow"),"p1":text(f"<p>{story_ps[0]}</p>","paragraph",max_width="narrow"),"p2":text(f"<p>{story_ps[1]}</p>","paragraph",max_width="narrow"),"p3":text(f"<p>{story_ps[2]}</p>","paragraph",max_width="narrow"),"sign":text("<p>The Mareluce team</p>","h6",SOFT),"cta":button("Read our story","/pages/our-story","button-secondary")},gap=14,valign="center")}
add("story",{"type":"section","blocks":story_blocks,"block_order":list(story_blocks.keys()),"name":"Our story","settings":section_settings(direction="row",gap=56,pad=(72,72),vertical_alignment="center",horizontal_alignment="space-between")})

# 7 LOOKS
add("looks",coll_list("looks","Looks",["the-golden-hour-look","satin-and-boots","the-knit-set"],{"eyebrow":text("<p>Looks</p>","h6"),"heading":text("<h2>Three ways to wear the evening.</h2>","h2",max_width="narrow"),"body":text("<p>Three pieces to a look. Pick your sizes on each look page.</p>","paragraph",max_width="narrow")},3,"1",(48,72)))

# 8 TRUST
def trust(iconname,title,line):
    return group({"icon":icon(iconname,28,CORAL),"txt":group({"h":text(f"<h3>{title}</h3>","h4"),"p":text(f"<p>{line}</p>","paragraph",SOFT)},gap=6)},gap=14,halign="flex-start")
trust_blocks={"t1":trust("lock","Secure Shopify checkout","Payment is handled by Shopify's checkout. We never see your card details."),"t2":trust("truck","Ships to 41 countries","Your shipping rate and delivery window are shown at checkout, before you pay. Orders are fulfilled from partner supplier warehouses."),"t3":trust("ruler","Measurements on every page","Each style lists its own size run and measurements, so you can compare with something you already own."),"t4":trust("chat_bubble","A person answers","Not sure between two sizes? <a href=\"/pages/contact\">Email us</a> before you order and we will tell you what we would pick.")}
add("trust",{"type":"section","blocks":trust_blocks,"block_order":list(trust_blocks.keys()),"name":"What you can count on","settings":section_settings(bg=BG,direction="row",gap=32,pad=(56,56),border="solid",border_width=1,border_opacity=100,border_color=HAIR,border_radius=0)})

# 9 FAQ
faq=[("How do I choose my size?","Each style has its own size run and measurements, listed on its product page. Measure a dress or top you already own and like the fit of, then compare it with the measurements on the product page. If a page is missing a measurement you need, email us before you order and we will check with the supplier."),("How long will delivery take, and what will it cost?","The shipping cost and the delivery window for your country are shown at checkout before you pay. Orders are fulfilled from partner supplier warehouses, which means international transit, so allow for that when you are ordering for a date."),("Can I return something that does not fit?","Email us before you send anything back. We will confirm whether the item can be returned, where to send it and who pays the postage, so nothing goes to the wrong place."),("What are the pieces made of?","The Amalfi is a satin slip, the Savona is all-over lace, the Verona and the Colette are lace-trimmed, the Costa is a knit, the Nova is a cable knit and the Como is a wool-blend knit. Fabric and care details are listed on the product page where the maker supplies them. A few styles in the catalogue are shown with digital renders rather than photographs and are marked as such on their own pages."),("I am between two sizes. Which one?","Go by the measurement that matters most for the style. Woven satin and lace have less give than knit, so for a slip, a corset or a bodycon dress take the larger size if your bust or hip sits between two columns. Knits and the two-piece sets forgive more, so the smaller size usually works. Still unsure? Send us your bust, waist and hip measurements and the style name and we will tell you what we would pick.")]
rows={}
for i,(q,a) in enumerate(faq):
    rows[f"row{i}"]={"type":"_accordion-row","settings":{"heading":q,"open_by_default":i==0,"icon":"none","width":20},"blocks":{"text":text(f"<p>{a}</p>","paragraph",SOFT)},"block_order":["text"]}
faq_blocks={"head":group({"eyebrow":text("<p>Questions</p>","h6"),"heading":text("<h2>Questions to ask before you order.</h2>","h2",max_width="narrow"),"body":text("<p>Straight answers on sizing, delivery, returns and fabric. Anything else, <a href=\"/pages/contact\">email us</a>.</p>","paragraph",max_width="narrow")},gap=8,width="custom",custom_width=40),
 "accordion":{"type":"accordion","settings":{"icon":"plus","dividers":True,"divider_color":HAIR,"type_preset":"h4","border":"none","border_width":1,"border_opacity":100,"border_radius":0,**PAD0},"blocks":rows,"block_order":list(rows.keys())}}
add("faq",{"type":"section","blocks":faq_blocks,"block_order":list(faq_blocks.keys()),"name":"FAQ","settings":section_settings(direction="row",gap=48,pad=(72,72),vertical_alignment="flex-start")})

# 10 NEWSLETTER
nl_blocks={"heading":text("<h2>First to know when a style lands.</h2>","h2",width="100%",align="center",max_width="narrow"),"body":text("<p>One email when a new style lands. No daily sends. Unsubscribe from any email in one tap.</p>","paragraph",width="100%",align="center",max_width="narrow"),
 "signup":{"type":"email-signup","settings":{"width":"custom","custom_width":50,"heading":"","heading_preset":"h3","border_style":"all","input_style":"custom","border_width":1,"border_radius":2,"input_background_color":BG,"input_text_color":INK,"input_border_color":INK,"input_type_preset":"paragraph","style_class":"button-custom","custom_button_background":INK,"custom_button_text":BG,"custom_button_border":INK,"display_type":"text","label":"Sign me up","integrated_button":True,"button_type_preset":"paragraph",**PAD0},"blocks":{}}}
add("newsletter",{"type":"section","blocks":nl_blocks,"block_order":list(nl_blocks.keys()),"name":"Newsletter","settings":section_settings(bg=PEACH,gap=16,pad=(72,72),horizontal_alignment_flex_direction_column="center")})

index={"sections":sections,"order":order}
json.dump(index,open("index.json","w"),indent=2,ensure_ascii=False)

# HEADER GROUP
ann=lambda t:{"type":"_announcement","settings":{"text":t,"link":"","font":"var(--font-subheading--family)","font_size":"0.75rem","weight":"500","letter_spacing":"loose","case":"uppercase","text_color":BG},"blocks":{}}
header={"type":"header","name":"Header","sections":{
 "announcements":{"type":"header-announcements","blocks":{"a1":ann("Jamálati is now Mareluce. Same pieces, new name."),"a2":ann("Free shipping on orders over $120."),"a3":ann("Ships to 41 countries. Secure Shopify checkout.")},"block_order":["a1","a2","a3"],"name":"t:names.announcement_bar","settings":{"speed":6,"section_width":"page-width","background_color":INK,"divider_width":0,"padding-block-start":10,"padding-block-end":10}},
 "header_section":{"type":"header","blocks":{"header-logo":{"type":"_header-logo","static":True,"settings":{"hide_logo_on_home_page":False,"padding-block-start":0,"padding-block-end":0},"blocks":{}},"header-menu":{"type":"_header-menu","static":True,"settings":{"menu":"main-menu","background_color":BG,"type_font_primary_size":"0.75rem","menu_font_style":"regular","type_font_primary_link":"subheading","type_case_primary_link":"uppercase","menu_style":"text","featured_products_aspect_ratio":"4 / 5","featured_collections_aspect_ratio":"16 / 9","image_border_radius":0,"navigation_bar":False,"drawer_accordion":False,"drawer_accordion_expand_first":False,"drawer_dividers":True},"blocks":{}}},"settings":{"logo_position":"left","menu_position":"center","menu_row":"top","customer_account_menu":"customer-account-main-menu","show_search":True,"search_position":"right","search_row":"top","show_country":True,"country_selector_style":False,"show_language":False,"localization_font":"body","localization_font_size":"0.75rem","localization_position":"right","localization_row":"top","section_width":"page-width","section_height":"standard","enable_sticky_header":"always","divider_width":0,"border_width":1,"bottom_border_color":HAIR,"actions_display_style":"icon","background_color_top":BG,"text_color_top":INK,"bubble_style":"custom","bubble_background_color":CORAL,"bubble_text_color":INK,"enable_transparent_header_home":True,"home_inverse_logo":True,"text_color_transparent_home":BG,"enable_transparent_header_product":False,"enable_transparent_header_collection":False}}},
 "order":["announcements","header_section"]}
json.dump(header,open("header-group.json","w"),indent=2,ensure_ascii=False)

# FOOTER GROUP
menu=lambda handle,heading:{"type":"menu","settings":{"menu":handle,"heading":heading,"menu_spacing":10,"show_as_accordion":False,"accordion_icon":"caret","accordion_dividers":False,"text_color":BG,"heading_preset":"h6","link_preset":"paragraph",**PAD0},"blocks":{}}
footer_blocks={"cols":group({
 "brand":group({"logo":{"type":"logo","settings":{"inverse":True,"font":"heading","unit":"pixel","percent_width":100,"pixel_height":26,"custom_mobile_size":False,"unit_mobile":"pixel","percent_width_mobile":100,"pixel_height_mobile":26,**PAD0},"blocks":{}},"line":text("<p>Mareluce, formerly Jamálati, is an online womenswear brand. We curate occasion and holiday pieces from partner suppliers and answer every message ourselves, by email.</p>","paragraph",PEACH,max_width="narrow")},gap=16),
 "shop":menu("main-menu","Shop"),
 "help":menu("footer","Help"),
 "news":group({"h":text("<p>First to know when a style lands.</p>","h6",BG),"signup":{"type":"email-signup","settings":{"width":"fill","custom_width":100,"heading":"","heading_preset":"h3","border_style":"underline","input_style":"custom","border_width":1,"border_radius":0,"input_background_color":"rgba(0,0,0,0)","input_text_color":BG,"input_border_color":PEACH,"input_type_preset":"paragraph","style_class":"button-unstyled","link_text_color":PEACH,"display_type":"arrow","label":"Sign up","integrated_button":False,"button_type_preset":"paragraph",**PAD0},"blocks":{}}},gap=12)
},direction="row",gap=40,valign="flex-start")}
footer={"type":"footer","name":"Footer","sections":{
 "footer_main":{"type":"footer","blocks":footer_blocks,"block_order":list(footer_blocks.keys()),"name":"t:names.footer","settings":{"section_width":"page-width","gap":24,"background_color":INK,"padding-block-start":56,"padding-block-end":40}},
 "footer_utilities":{"type":"footer-utilities","blocks":{"copyright":{"type":"footer-copyright","settings":{"show_powered_by":False,"text_color":PEACH,"font_size":"0.75rem","case":"none"},"blocks":{}},"policies":{"type":"footer-policy-list","settings":{"text_color":PEACH,"font_size":"0.75rem","case":"none"},"blocks":{}}},"block_order":["copyright","policies"],"name":"t:names.utilities","settings":{"section_width":"page-width","gap":24,"divider_thickness":1,"divider_color":DEEP,"background_color":INK,"padding-block-start":20,"padding-block-end":40}}},
 "order":["footer_main","footer_utilities"]}
json.dump(footer,open("footer-group.json","w"),indent=2,ensure_ascii=False)

# SETTINGS DATA
cur={"logo":"shopify://shop_images/mareluce-logo-ink.png","logo_inverse":"shopify://shop_images/mareluce-logo-cream.png","logo_height":30,"logo_height_mobile":24,"favicon":"shopify://shop_images/mareluce-monogram.png",
"page_background_color":"{{ settings.color_palette.background }}","page_width":"normal","page_text_color":"{{ settings.color_palette.foreground }}",
"type_body_font":"figtree_n4","type_subheading_font":"figtree_n5","type_heading_font":"cormorant_n5","type_accent_font":"cormorant_i5","type_size_paragraph":"16","type_line_height_paragraph":"body-loose",
"type_font_h1":"heading","type_size_h1":"72","type_line_height_h1":"display-tight","type_letter_spacing_h1":"heading-normal","type_case_h1":"none",
"type_font_h2":"heading","type_size_h2":"48","type_line_height_h2":"display-tight","type_letter_spacing_h2":"heading-normal","type_case_h2":"none",
"type_font_h3":"heading","type_size_h3":"32","type_line_height_h3":"display-normal","type_letter_spacing_h3":"heading-normal","type_case_h3":"none",
"type_font_h4":"heading","type_size_h4":"24","type_line_height_h4":"display-normal","type_letter_spacing_h4":"heading-normal","type_case_h4":"none",
"type_font_h5":"subheading","type_size_h5":"14","type_line_height_h5":"display-loose","type_letter_spacing_h5":"heading-loose","type_case_h5":"uppercase",
"type_font_h6":"subheading","type_size_h6":"12","type_line_height_h6":"display-loose","type_letter_spacing_h6":"heading-loose","type_case_h6":"uppercase",
"page_transition_enabled":False,"transition_to_main_product":True,"add_to_cart_animation":True,"card_hover_effect":"subtle-zoom",
"badge_position":"top-left","badge_corner_radius":0,"badge_sale_background_color":CORAL,"badge_sale_text_color":INK,"badge_sold_out_background_color":HAIR,"badge_sold_out_text_color":INK,"badge_font_family":"subheading","badge_text_transform":"uppercase",
"palette_primary_button_background":CORAL,"palette_primary_button_text":INK,"palette_primary_button_border":CORAL,"primary_button_border_width":0,"button_border_radius_primary":2,"type_font_button_primary":"body","button_text_case_primary":"default",
"palette_secondary_button_background":"rgba(0,0,0,0)","palette_secondary_button_text":INK,"palette_secondary_button_border":INK,"secondary_button_border_width":1,"button_border_radius_secondary":2,"type_font_button_secondary":"body","button_text_case_secondary":"default","pills_border_radius":40,
"cart_type":"drawer","product_title_case":"default","cart_price_font":"subheading","auto_open_cart_drawer":True,"show_cart_note":False,"cart_note_open_by_default":False,"show_add_discount_code":True,"show_installments":True,"show_accelerated_checkout_buttons":True,"empty_cart_button_link":"/collections/dresses","cart_thumbnail_border":"none","cart_thumbnail_border_width":1,"cart_thumbnail_border_opacity":50,"cart_thumbnail_border_radius":2,
"drawer_background_color":BG,"drawer_text_color":INK,"drawer_border_color":HAIR,"icon_stroke":"default",
"palette_input_background":BG,"palette_input_text":INK,"palette_input_border":HAIR,"input_border_width":1,"inputs_border_radius":2,"type_preset":"paragraph",
"popover_background_color":BG,"popover_text_color":INK,"popover_border_radius":4,"popover_border_color":HAIR,"popover_border_width":1,"popover_drop_shadow":True,"popover_shadow_color":INK,
"currency_code_enabled_product_pages":True,"currency_code_enabled_product_cards":False,"currency_code_enabled_cart_items":False,"currency_code_enabled_cart_total":True,
"quick_add":True,"mobile_quick_add":False,"quick_add_background":BG,"quick_add_text":INK,"show_second_image_on_hover":True,"product_card_carousel":False,
"empty_state_collection":"dresses","product_corner_radius":0,"card_corner_radius":0,"card_title_case":"default",
"show_variant_image":False,"variant_swatch_width":28,"variant_swatch_height":28,"variant_swatch_radius":100,"variant_swatch_border_style":"solid","variant_swatch_border_width":1,"variant_swatch_border_opacity":15,
"palette_variant_background":BG,"palette_variant_text":INK,"palette_variant_border":HAIR,"palette_selected_variant_background":INK,"palette_selected_variant_text":BG,"palette_selected_variant_border":INK,"variant_button_border_width":1,"variant_button_radius":2,"variant_button_width":"equal-width-buttons",
"color_palette":{"background":BG,"foreground":INK,"color1":SOFT,"color2":HAIR}}
settings={"current":cur,"presets":{"Mareluce":cur}}
json.dump(settings,open("settings_data.json","w"),indent=2,ensure_ascii=False)

# scan for dashes and sizes
import re
for f in ["index.json","header-group.json","footer-group.json","settings_data.json"]:
    s=open(f).read(); print(f,len(s),"dashes:",len(re.findall("[–—]",s)))
files=[{"filename":"templates/index.json","body":{"type":"TEXT","value":open("index.json").read()}},{"filename":"sections/header-group.json","body":{"type":"TEXT","value":open("header-group.json").read()}},{"filename":"sections/footer-group.json","body":{"type":"TEXT","value":open("footer-group.json").read()}},{"filename":"config/settings_data.json","body":{"type":"TEXT","value":open("settings_data.json").read()}}]
json.dump({"themeId":"gid://shopify/OnlineStoreTheme/205666582865","files":files},open("upsert-vars.json","w"),ensure_ascii=False)
print("vars bytes",len(open("upsert-vars.json").read()))
