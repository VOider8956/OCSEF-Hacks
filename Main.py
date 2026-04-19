import pandas as pd 
import json

with open('formatted.json', 'r') as f:
    data = json.load(f)

def flatten_sheet(sheet_name):
    sheet = [s for s in data['sheets'] if s['name'] == sheet_name][0]
    rows = []
    for row in sheet['data']:
        merged_row = {}
        for item in row:
            merged_row.update(item)
        rows.append(merged_row)
    return pd.DataFrame(rows)

df_products = flatten_sheet('Product')
df_categories = flatten_sheet('Category')

df_full = pd.merge(
    df_products, 
    df_categories.rename(columns={'ID': 'Category_ID'}), 
    on='Category_ID', 
    how='left'
)


produce_items = df_full[df_full['Category_Name'] == 'Produce']

def search_expiration(product_name):
    result = df_full[df_full['Name'].str.contains(product_name, case=False, na=False)]
    
    if result.empty:
        return f"No information found for '{product_name}'."
    
    storage_info = result[[
        'Name', 
        'Pantry_Min', 'Pantry_Max', 'Pantry_Metric',
        'Refrigerate_Min', 'Refrigerate_Max', 'Refrigerate_Metric',
        'Freeze_Min', 'Freeze_Max', 'Freeze_Metric'
    ]]
    
    return storage_info

end_process = False

while not end_process:
    want_to_check = input("Want to search for a product ? y/n")

    if want_to_check.lower() == "y":
        check = input("Search Product: ")
        print(search_expiration(check))
        
        final_selection = input 
    else:
        end_process = True
        