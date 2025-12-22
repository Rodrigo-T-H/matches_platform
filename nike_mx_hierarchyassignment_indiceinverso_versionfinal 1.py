#!/usr/bin/env python
# coding: utf-8

# In[45]:


import pandas as pd
from fuzzywuzzy import fuzz
import os
import datetime
from collections import defaultdict
import numpy as np


# # VARIABLES TO ADJUST

# In[3]:


folder_name= '78. Nike'
client_name = 'nike_mx' #without spaces
delivery_date_year = "2025"
delivery_date_month = "12" #consider two digits for single digit months e.g. "01" or "06"
delivery_date_day = "05" #consider two digits for single digit days e.g. "01" or "06"
nike_client_file = 'HO25 Template - Data Bunker- Nike_Dec2025.xlsx' #name of file shared by customer

delivery_date= delivery_date_year+"-"+delivery_date_month+"-"+delivery_date_day
folder_name + " - " + client_name + " - " +delivery_date + " - " + nike_client_file


# # DATA PROCESSING FUNCTIONS

# In[7]:


#Autor: Ricardo Velazquez Rios
#Correo autor: ricardo.velazquez@data-bunker.com.mx
#
import pandas as pd
import glob
import re
from datetime import timedelta
from datetime import date

#Comment test git
LIST_COLUMN_ORDER = ['Date', 'Canal', 'Category', 'Subcategory', 'Subcategory2', 'Subcategory3', 'Marca',
                     'Modelo', 'SKU', 'UPC', 'Item', 'Item Characteristics', 'URL SKU', 'Image', 'Price',
                     'Sale Price', 'Shipment Cost', 'Sales Flag', 'Store ID', 'Store Name',
                     'Store Address', 'Stock', 'UPC WM2', 'Final Price', 'UPC WM', 'COMP']

LIST_COLUMN_ORDER_SHORT = ['Date', 'Canal', 'Category', 'Subcategory', 'Subcategory2', 'Subcategory3', 'Marca',
                     'Modelo', 'SKU', 'UPC', 'Item', 'Item Characteristics', 'URL SKU', 'Image', 'Price',
                     'Sale Price', 'Shipment Cost', 'Sales Flag', 'Store ID', 'Store Name',
                     'Store Address', 'Stock', 'UPC WM', 'Final Price']

LIST_COLUMN_ORDER_M = ['Date', 'Canal', 'Category', 'Subcategory', 'Subcategory2', 'Subcategory3', 'Marca',
                      'Modelo', 'SKU', 'UPC', 'Item', 'Item Characteristics', 'URL SKU', 'Image', 'Price',
                      'Sale Price', 'Shipment Cost', 'Sales Flag', 'Store ID', 'Store Name',
                      'Store Address', 'Stock', 'UPC WM2', 'Final Price', 'UPC WM', 'COMP',
                      'GR', 'CAT C', 'SUB C', 'MARCA C'	, 'Precio Gramo', 'MARCA 2', 'Congelado']

COMPETITORS_FLOAT_COLUMNS = ['Price', 'Final Price', 'Sale Price']
COMPETITORS_STRING_COLUMNS = ['UPC', 'EAN', 'UPC WM', 'UPC WM2']
COMPARISON_STRING_COLUMNS = ['upc_wm2_client', 'match', 'upc_wm2_competitor']

#Start Data Frame Utils

#This section is only for functions that work on columns of a Data Frame
#   object. To call them use the class method apply().
def create_upc_wm(strUPC, strChannel = ''):
    
    if strUPC.isdigit():
        if 'Walmart' in strChannel or 'walmart' in strChannel:
            pass
        else:
            if len(strUPC) > 7:
                strUPC = strUPC[:-1]
    
        while len(strUPC) < 16:
                strUPC = '0' + strUPC
                
    return strUPC

def select_upc_wm2(strUPCWM_Competitors, strUPCWM_Comparison):
    if pd.isna(strUPCWM_Comparison):
        return strUPCWM_Competitors
    else:
        return strUPCWM_Comparison

def get_weights(strItem, regPattern):
    #Buscar optimizar esta sección

    lstGram_Names = ['g', 'gr', 'gramo', 'gramos', 'grms', 'grm']
    lstFuzzy_Words = ['granos']

    for strFuzzy_Word in lstFuzzy_Words:
        strItem = strItem.replace(strFuzzy_Word, "")

    if any(strGram_Name in strItem for strGram_Name in lstGram_Names):
        strExtraction = strItem.replace(' ',  '')

        if regPattern.search(strExtraction):
            strExtraction = regPattern.search(strExtraction)
            strExtraction = strExtraction.group(1)

            strExtraction = strExtraction.replace('g', '')
            return strExtraction
        else:
            return '0'
    elif 'bolzalza' in strItem:
        return 'Bolzalza'
    else:
        return '0'

def get_weights_kilograms(strItem, regPattern):
    #Buscar optimizar esta sección

    lstGram_Names = ['kg', 'kgr', 'kilogramo', 'kilo']

    if any(strGram_Name in strItem for strGram_Name in lstGram_Names):
        strExtraction = strItem.replace(' ',  '')

        if regPattern.search(strExtraction):
            strExtraction = regPattern.search(strExtraction)
            strExtraction = strExtraction.group(1)

            strExtraction = strExtraction.replace('k', '')
            fltExtraction = float(strExtraction) * 1000

            return str(fltExtraction)
        else:
            return '0'
    else:
        return '0'

def calculate_discount(fltPrice, fltFinal_Price):
    return 1 - (fltFinal_Price / fltPrice)

def calculate_price_per_kg(fltFinal_Price, strGram, boolIts_Pack = False):
    if strGram != 'Bolzalza' and strGram != '0' and boolIts_Pack == False:
        fltGram = float(strGram)
        fltPrice_Gram = fltFinal_Price / fltGram
        fltPrice_Gram = fltPrice_Gram * 1000

        return fltPrice_Gram
    else:
        return 0

def determine_if_pack(strItem):
    lstPieces_Names = ['piezas', 'pzs', 'pzas']

    if any(strPieces_Name in strItem for strPieces_Name in lstPieces_Names):
        return True
    else:
        return False

#End Data Frame Utils

#Start File Util Functions
def convert_excel_to_df(strExcel_Path):
    lstSheets = pd.ExcelFile(strExcel_Path).sheet_names

    dfConcat_Excel = pd.concat([pd.read_excel(strExcel_Path, sheet_name = strSheet_Name) for strSheet_Name
                           in lstSheets], ignore_index = True)

    return dfConcat_Excel

def consolidate_competitors_df(strPath_Read, lstItem_Words = []):
    if len(strPath_Read) < 3:
        raise ValueError('Path is too short for a valid file location.')

    lstFilenames = glob.glob(strPath_Read + "\*.csv") #Toma de ese path los archivos que tengan como extención csv

    lstDFs_Concat = []
    for strFilename in lstFilenames: #Nombre del los csv
        print(strFilename)
        dfAux = pd.read_csv(strFilename, dtype = str) #dataframe leido por iteracion

        lstColumns = dfAux.columns.to_list() #Nombres de las columnas
        dictNew_Columns = homogonize_column_names(lstColumns)
        dfAux.rename(columns = dictNew_Columns, inplace = True)

        lstDFs_Concat.append(dfAux) #añadir a lista de dataframes

    dfConsolidated_Competitors = pd.concat(lstDFs_Concat) #Concatenar lista de dataframe a un solo dataframe

    if len(lstItem_Words) > 0:
        dfConsolidated_Competitors = dfConsolidated_Competitors[
                                        dfConsolidated_Competitors['Item'].str.contains('|'.join(lstItem_Words))
                                        ].reset_index(drop = True) #Filtrar por palabras

    dfConsolidated_Competitors.drop(columns=['UPC WM'], inplace = True) #Eliminar UPC WN
    dfConsolidated_Competitors['UPC'] = dfConsolidated_Competitors['UPC'].str.replace('\.0+$', '',
                                           regex = True)
    dfConsolidated_Competitors['UPC'] = dfConsolidated_Competitors['UPC'].fillna('')
    dfConsolidated_Competitors['UPC'] = dfConsolidated_Competitors['UPC'].astype(str)
    dfConsolidated_Competitors['Canal'] = dfConsolidated_Competitors['Canal'].astype(str)
    dfConsolidated_Competitors['UPC WM'] = dfConsolidated_Competitors.apply(lambda row:
                                             create_upc_wm(row['UPC'], row['Canal']), axis = 1)
    dfConsolidated_Competitors['UPC WM2'] = dfConsolidated_Competitors['UPC WM']


    dfConsolidated_Competitors[COMPETITORS_FLOAT_COLUMNS] = dfConsolidated_Competitors[COMPETITORS_FLOAT_COLUMNS].replace(
                                                                {'\$': '',
                                                                 ',': '',
                                                                 r'\[': '',
                                                                 r'\]': '',
                                                                 'Price': '0'}, regex = True) #Reemplazar ciertos caracteres

    #dfConsolidated_Competitors[COMPETITORS_FLOAT_COLUMNS] = dfConsolidated_Competitors[COMPETITORS_FLOAT_COLUMNS].astype(float)

    dfConsolidated_Competitors['COMP'] = ''

    dfConsolidated_Competitors = dfConsolidated_Competitors[LIST_COLUMN_ORDER] #Ordenar dataframe

    dfConsolidated_Competitors = dfConsolidated_Competitors[(dfConsolidated_Competitors['Price'].notna()) |
                                                            (dfConsolidated_Competitors['Price'] != '0')] #Filtrar por precio vacio

    return dfConsolidated_Competitors

def get_comparison_df(strPath_Comparison_File, strSheet_Name):
    dictComparison_Dtypes = {strColumn_Name: 'str' for strColumn_Name in COMPARISON_STRING_COLUMNS}

    dfComparison = pd.read_excel(strPath_Comparison_File, sheet_name = strSheet_Name,
                                dtype = dictComparison_Dtypes)

    dfComparison = dfComparison[['upc_wm2_client', 'match', 'upc_wm2_competitor']]
    dfComparison = dfComparison.dropna(subset = ['upc_wm2_competitor'])
    dfComparison.drop_duplicates(inplace = True)

    return dfComparison

def replace_upc_wm2(dfCompetitors, dfComparison):
    dfCompetitors = dfCompetitors.merge(dfComparison, how = 'left' ,left_on = 'UPC WM2', right_on = 'upc_wm2_competitor')

    dfCompetitors['UPC WM'] = dfCompetitors.apply(lambda row:  select_upc_wm2(row['UPC WM2'],
                                  row['upc_wm2_client']), axis = 1)

    dfCompetitors.drop(columns = COMPARISON_STRING_COLUMNS, inplace = True)

    return dfCompetitors

def extract_weight(dfCompetitors):
    strRegex_Grams = '([0-9]+\.?[0-9]*\s?g)'
    strRegex_Kgs = '([0-9]+\.?[0-9]*\s?k)'
    lstPer_KG_Names = ['por kilo', 'el kilo', 'por kg', 'kg', 'kilo']

    regPattern_Grams = re.compile(strRegex_Grams)
    regPattern_KG = re.compile(strRegex_Kgs)

    dfCompetitors['aux_item'] = dfCompetitors['Item']
    dfCompetitors['aux_item'] = dfCompetitors['aux_item'].astype(str)
    dfCompetitors['aux_item'] = dfCompetitors['aux_item'].str.lower()
    dfCompetitors['aux_item'] = dfCompetitors['aux_item'].str.replace('-', '')

    dfCompetitors_Kilos = dfCompetitors[dfCompetitors['aux_item'].str.contains(strRegex_Kgs,
                             regex = True)].reset_index(drop = True)
    dfCompetitors_aux = dfCompetitors[~dfCompetitors['aux_item'].str.contains(strRegex_Kgs,
                            regex = True)].reset_index(drop = True)

    dfCompetitors_Kilos['Cantidad'] = dfCompetitors_Kilos.apply(lambda row: get_weights_kilograms(row['aux_item'],
                                   regPattern_KG), axis = 1, result_type = 'reduce')

    dfCompetitors_Grams = dfCompetitors_aux[dfCompetitors_aux['aux_item'].str.contains(strRegex_Grams,
                              regex = True)].reset_index(drop = True)
    dfCompetitors_aux = dfCompetitors_aux[~dfCompetitors_aux['aux_item'].str.contains(strRegex_Grams
                            )].reset_index(drop = True)

    dfCompetitors_Grams['Cantidad'] = dfCompetitors_Grams.apply(lambda row: get_weights(row['aux_item'],
                               regPattern_Grams), axis = 1, result_type = 'reduce')

    dfCompetitor_One_Kilo = dfCompetitors_aux[(dfCompetitors_aux['aux_item'].str.contains('|'.join(lstPer_KG_Names),
                                regex = True))].reset_index(drop = True)
    dfCompetitors_aux = dfCompetitors_aux[(~dfCompetitors_aux['aux_item'].str.contains('|'.join(lstPer_KG_Names),
                            regex = True))].reset_index(drop = True)

    dfCompetitor_One_Kilo['Cantidad'] = 1000

    dfCompetitors_aux['Cantidad'] = 0

    dfCompetitors = pd.concat([dfCompetitors_Kilos, dfCompetitors_Grams, dfCompetitor_One_Kilo, dfCompetitors_aux],
                        ignore_index = True)

    dfCompetitors['Unidad'] = 'gr'

    dfCompetitors.drop(columns = ['aux_item'], inplace = True)

    return dfCompetitors

def extract_ml(dfCompetitors):
    reMililiters = re.compile(r'[0-9]+\.?[0-9]*ml', re.IGNORECASE)

    lstIndexs = [j for j in range(len(dfCompetitors))]
    dfCompetitors['Cantidad'] = list(map(lambda i: "".join(reMililiters.findall(dfCompetitors.Item[i].replace(" ml", "ml").replace(" - ", "")))[:-2] , lstIndexs))

    dfCompetitors.loc[dfCompetitors.Cantidad == "", 'Cantidad'] = 0
    dfCompetitors.Cantidad = dfCompetitors.Cantidad.astype(float)
    dfCompetitors['Unidad'] = 'ml'

    return dfCompetitors

def extract_quantities_and_units(dfCompetitors):
    dfCompetitors = extract_ml(dfCompetitors)

    dfCompetitors_Ml =  dfCompetitors[dfCompetitors['Cantidad'] != 0].reset_index(drop = True)
    dfCompetitors_Aux = dfCompetitors[dfCompetitors['Cantidad'] == 0].reset_index(drop = True)

    dfCompetitors_Aux = extract_weight(dfCompetitors_Aux)

    return pd.concat([dfCompetitors_Ml, dfCompetitors_Aux], ignore_index = True)

def compare_rows(dfTo_Compare, intPosition_Fst_Row, intPosition_Sec_Row):
    lstColumn_Names = dfTo_Compare.columns.to_list()

    dicResult = {}
    for strColumn_name in lstColumn_Names:
        rowFirst_Value = dfTo_Compare.loc[intPosition_Fst_Row, strColumn_name]
        rowSecond_Value = dfTo_Compare.loc[intPosition_Fst_Row, strColumn_name]

        if pd.isna(rowFirst_Value) and pd.isna(rowSecond_Value):
            dicResult[strColumn_name] = True

        else:
            dicResult[strColumn_name] = rowFirst_Value == rowSecond_Value

    return dicResult

def homogonize_column_names(lstColumns):
    setColumns_Upper = ['sku', 'upc', 'url sku', 'upc wm']

    dictNew_Columns = {}
    for strColumn_Name in lstColumns:
        strNew_Column = strColumn_Name.lower().replace('_', ' ')

        if strNew_Column == 'store id':
            dictNew_Columns[strColumn_Name] = 'Store ID'
        elif strNew_Column not in setColumns_Upper:
            dictNew_Columns[strColumn_Name] = strNew_Column.title()
        else:
            dictNew_Columns[strColumn_Name] = strNew_Column.upper()

    return dictNew_Columns
#End File Util Functions

#Function get monday date
def calculate_update_date():
    now = date.today()
    monday_date = now - timedelta(days=now.weekday())

    return monday_date.isoformat()

#Function get counts Date and UPC grouping
def getCounts(dfCompetitors):
    dfGrouping = dfCompetitors.groupby(by=["Date","UPC WM"]).size().reset_index(name='counts')
    dfCompetitors = pd.merge(dfCompetitors, dfGrouping, on=["Date", "UPC WM"])
    return dfCompetitors


# # DATA PROCESSING - COMPETITORS

# In[4]:


now= datetime.datetime.now()
dt_format = '%Y-%m-%d'
strDate = now.strftime(dt_format)
print(strDate)


# In[5]:


strPath = f'G:/.shortcut-targets-by-id/1DGKdwLSUpGZ6Tr1dtRGbhYNj1kt97M_L/Data Bunker Ops/2. Entregables/{folder_name}/'
strPath


# In[8]:


dfCompetitors = consolidate_competitors_df(strPath+'carga_competitors')
dfCompetitors 


# In[9]:


dfCompetitors['Canal'].unique()


# In[10]:


len(dfCompetitors)


# In[11]:


dfCompetitors = dfCompetitors.drop_duplicates()
len(dfCompetitors)


# In[12]:


dfCompetitors['Price'] = dfCompetitors['Price'].astype(str)
dfCompetitors = dfCompetitors[dfCompetitors['Price']!='0'].reset_index(drop = True)
dfCompetitors = dfCompetitors[dfCompetitors['Price']!=""].reset_index(drop = True)
dfCompetitors = dfCompetitors[dfCompetitors['Price'].notna()].reset_index(drop = True)
dfCompetitors = dfCompetitors[~dfCompetitors['Price'].str.contains('None')].reset_index(drop = True)
len(dfCompetitors)


# In[13]:


dfCompetitors['UPC'] = dfCompetitors['UPC'].astype(str)
dfCompetitors = dfCompetitors[dfCompetitors['UPC']!='0'].reset_index(drop = True)
dfCompetitors = dfCompetitors[dfCompetitors['UPC']!=""].reset_index(drop = True)
dfCompetitors = dfCompetitors[dfCompetitors['UPC'].notna()].reset_index(drop = True)
dfCompetitors = dfCompetitors[~dfCompetitors['UPC'].str.contains('None')].reset_index(drop = True)
len(dfCompetitors)


# In[14]:


dfCompetitors = dfCompetitors.drop_duplicates(subset=["SKU", "Date", "Canal", "UPC", "Image", "Final Price"], keep="first")
len(dfCompetitors)


# In[15]:


dfCompetitors['Date'] = delivery_date
dfCompetitors


# In[16]:


#ASSURING THAT UPC WM IS FULL DIGIT LENGHT OF UPC AND JUST WITH LEADING ZEROS
dfCompetitors['UPC WM2'] = dfCompetitors['UPC'].apply(lambda x: str(x).zfill(16))
dfCompetitors['UPC WM']=dfCompetitors['UPC WM2']
dfCompetitors[['UPC','UPC WM', 'UPC WM2']]


# In[17]:


dfCompetitorsUSA = dfCompetitors[dfCompetitors['Store ID'].str.contains('9999_adidas_us')]
dfCompetitorsUSA


# In[18]:


dfCompetitors = dfCompetitors[~dfCompetitors['Store ID'].str.contains('9999_adidas_us')]
dfCompetitors['Store ID'].unique()


# In[19]:


dfCompetitorsUSA['Store ID'].unique()


# In[20]:


dfCompetitors.to_csv(strPath + f'/competitors_csv/{client_name}_competitors_{delivery_date}.csv', index = False, encoding="utf-8-sig")
dfCompetitorsUSA.to_csv(strPath + f'/competitors_csv/{client_name}_usa_{delivery_date}.csv', index = False, encoding="utf-8-sig")


# # DATA PROCESSING  - CLIENT

# In[20]:


dfClient = pd.read_excel(strPath+"carga_client/"+nike_client_file)
dfClient


# In[21]:


column_mapping = {
    'BUSINESS UNIT': 'Category',
    'CATEGORY': 'Subcategory2',
    'Style': 'SKU',
    'MATERIAL': 'UPC',
    'DESCRIPTION': 'Item',
    'GENDER': 'Subcategory',
    'AGE': 'Stock',
    'SILHOUETTE': 'Subcategory3',
    'PRECIO_CON_IVA': 'Price',
    'DIMENSION': 'Modelo'
}
dfClient.rename(columns=column_mapping, inplace=True)
dfClient.head()


# In[22]:


# Añadir las nuevas columnas con valores constantes
dfClient['Date'] = delivery_date
dfClient['Canal'] = 'Nike Mx'
dfClient['Marca'] = 'Nike'
dfClient['Store ID'] = '9999_nikemx'
dfClient['Store Name'] = 'ONLINE'
dfClient['Store Address'] = 'ONLINE'
dfClient['COMP'] = ''
dfClient['UPC WM'] = dfClient['UPC'].apply(lambda x: str(x).zfill(16))
dfClient['UPC WM2'] = dfClient['UPC WM']
dfClient['Sale Price'] = ''
dfClient['Final Price'] = dfClient['Price']


# Reordenar las columnas
column_order = [
    'Date', 'Canal', 'Category', 'Subcategory', 'Subcategory2', 'Subcategory3', 'Marca', 'Modelo', 'SKU', 'UPC', 
    'Item', 'Item Characteristics', 'URL SKU', 'Image', 'Price', 'Sale Price', 'Shipment Cost', 'Sales Flag', 
    'Store ID', 'Store Name', 'Store Address', 'Stock', 'UPC WM2', 'Final Price', 'UPC WM', 'COMP'
]

for col in column_order:
    if col not in dfClient.columns:
        dfClient[col] = ''
dfClient = dfClient[column_order]
dfClient


# In[24]:


dfClient.to_csv(strPath + f'/competitors_csv/{client_name}_nikedata_{delivery_date}.csv', index = False, encoding="utf-8-sig")


# # MATCHING PROCESS

# In[23]:


dfMatch = pd.read_excel(strPath+"product_match.xlsx")
dfMatch


# In[24]:


dfMatch['Item'] = dfMatch['Item'].fillna('')
dfMatch['Category'] = dfMatch['Category'].fillna('')
dfMatch['Subcategory'] = dfMatch['Subcategory'].fillna('')
dfMatch['Subcategory2'] = dfMatch['Subcategory2'].fillna('')
dfMatch['Subcategory3'] = dfMatch['Subcategory3'].fillna('')

dfMatch['item_conc'] = (
    dfMatch['Item'].astype(str) + " "+
    dfMatch['Category'].astype(str) + " "+
    dfMatch['Subcategory'].astype(str) + " "+
    dfMatch['Subcategory2'].astype(str) + " "+
    dfMatch['Subcategory3'].astype(str)
)

# Mostrar el resultado
dfMatch['item_conc']


# In[25]:


dfMatch['Canal'].unique()


# In[26]:


dfMatch= dfMatch[~dfMatch['Canal'].str.contains('Nike Mx')]
dfMatch['Canal'].unique()


# In[27]:


dfMatch['Category_Nike_conc'] = (
    dfMatch['Categoria_Nike'].astype(str) + "-"+
    dfMatch['Subcategoria_Nike'].astype(str) +  "-"+
    dfMatch['Subcategoria2_Nike'].astype(str) +  "-"+
    dfMatch['Subcatgory3_Nike'].astype(str) +  "-"+
    dfMatch['Subcatgory4_Nike'].astype(str) +  "-"+
    dfMatch['Subcatgory5_Nike'].astype(str) 
)
dfMatch['Category_Nike_conc']


# In[28]:


dfCompetitorsFilter = dfCompetitors
dfCompetitorsFilter.head()


# In[29]:


dfCompetitorsFilter['key'] = dfCompetitorsFilter['SKU'].astype(str) +  dfCompetitorsFilter['Canal'].astype(str)
dfCompetitorsFilter['key']


# In[30]:


merged_df = dfCompetitorsFilter.merge(dfMatch[['key']], on='key', how='left', indicator=True)
dfCompetitorsFilterCleaned = merged_df[merged_df['_merge'] == 'left_only'].drop(columns=['_merge'])
dfCompetitorsFilterCleaned


# In[81]:


dfCompetitorsFilterCleaned['Item'] = dfCompetitorsFilterCleaned['Item'].fillna('')
dfCompetitorsFilterCleaned['Category'] = dfCompetitorsFilterCleaned['Category'].fillna('')
dfCompetitorsFilterCleaned['Subcategory'] = dfCompetitorsFilterCleaned['Subcategory'].fillna('')
dfCompetitorsFilterCleaned['Subcategory2'] = dfCompetitorsFilterCleaned['Subcategory2'].fillna('')
dfCompetitorsFilterCleaned['Subcategory3'] = dfCompetitorsFilterCleaned['Subcategory3'].fillna('')

dfCompetitorsFilterCleaned['item_conc'] = (
    dfCompetitorsFilterCleaned['Item'].astype(str) + " "+
    dfCompetitorsFilterCleaned['Category'].astype(str) + " "+
    dfCompetitorsFilterCleaned['Subcategory'].astype(str) + " "+
    dfCompetitorsFilterCleaned['Subcategory2'].astype(str) + " "+
    dfCompetitorsFilterCleaned['Subcategory3'].astype(str)
)

# Mostrar el resultado
dfCompetitorsFilterCleaned['item_conc']


# In[82]:


dfMatch_cleaned = dfMatch.dropna(subset=['Category'])
dfMatch_cleaned = dfMatch_cleaned[dfMatch_cleaned['Category'].str.strip() != '']
print (str(len(dfMatch_cleaned)) +" - " + str(len (dfMatch)))


# # COMPARISSON FUNCTION

# In[84]:


def create_inverted_index(df, column):
    inverted_index = defaultdict(set)
    for idx, row in df.iterrows():
        words = set(row[column].lower().split())
        for word in words:
            inverted_index[word].add(idx)
    return inverted_index


# In[108]:


# Función para encontrar la mejor coincidencia
def find_best_match(new_description, inverted_index, hierarchy_df):
    words = set(new_description.lower().split())
    matched_records = defaultdict(int)
    for word in words:
        if word in inverted_index:
            for idx in inverted_index[word]:
                matched_records[idx] += 1
    
    if not matched_records:
        return "No Match Found"
    
    best_match = max(matched_records, key=matched_records.get)
    #print(best_match)
    return hierarchy_df.iloc[best_match]['Category_Nike_conc']


# In[91]:


products_hierarchy_df = dfMatch_cleaned
new_products_df = dfCompetitorsFilterCleaned
len (new_products_df)


# In[101]:


products_hierarchy_df = products_hierarchy_df.reset_index(drop=True)


# In[102]:


# Crear índice invertido para 'Item_conc'
inverted_index = create_inverted_index(products_hierarchy_df, 'item_conc')


# In[109]:


proposals = []
x = 0
for _, new_product in new_products_df.iterrows():
    x += 1
    print(f"--------{x}------------ out of {len(new_products_df)}---")
    print(new_product['item_conc'])
    proposal = find_best_match(new_product['item_conc'], inverted_index, products_hierarchy_df)
    print(proposal)
    proposals.append([new_product['item_conc'], new_product['Canal'], new_product['SKU'], new_product['UPC'], new_product['Item'],
                      new_product['URL SKU'], new_product['Image'], proposal] + proposal.split("-"))


# In[110]:


proposals_df = pd.DataFrame(proposals, columns=['Item_conc','Canal', 'SKU', 'UPC', 'Item', 'URL SKU', 'Image', 'proposal_conc',
                                                'Categoria_Nike', 'Subcategoria_Nike', 'Subcategoria2_Nike', 'Subcatgory3_Nike', 
                                                'Subcatgory4_Nike', 'Subcatgory5_Nike'])
proposals_df


# # Condicionales

# In[111]:


def map_item_conc_to_subcategoria(item_conc, current_subcategoria):
    item_conc = item_conc.lower()

    if any(substring in item_conc for substring in ["mujer", "dama", "women","femenil","femenin"]):
        return "WOMENS"
    elif any(substring in item_conc for substring in ["hombre", "caballero", "mens","unisex","masculin"]):
        return "MENS"
    elif any(substring in item_conc for substring in ["niño", "niña", "niños"]):
        return "KIDS"
    else:
        return current_subcategoria  # Keep the current value if conditions do not apply

def map_item_conc_to_subcategoria2(item_conc, current_subcategoria2):
    item_conc = item_conc.lower()

    if any(substring in item_conc for substring in ["fútbol americano","futbol americano", "football americano"]):
        return "OTHER"
    if any(substring in item_conc for substring in ["fútbol","futbol","football",]):
        return "FOOTBALL/SOCCER"
    elif any(substring in item_conc for substring in ["basketball","básquetbol","basquetbol"]):
        return "BASKETBALL"
    elif any(substring in item_conc for substring in ["skateboarding","skate","patinar"]):
        return "SKATEBOARDING"
    elif any(substring in item_conc for substring in ["para correr"]):
        return "RUNNING"
    elif any(substring in item_conc for substring in ["pádel", "paddel", "padel", "páddel", "natación","natacion", "bikini" ,"golf", "traje de baño"]):
        return "OTHER"
    else:
        return current_subcategoria2  # Keep the current value if conditions do not apply
# def map_item_conc_to_subcategoria3(item_conc, current_subcategoria3):
#     item_conc = item_conc.lower()

#     if any(substring in item_conc for substring in ["mochila", "cartera"]):
#         return "BAGS"
#     elif any(substring in item_conc for substring in ["playera polo", "polo"]):
#         return "POLO"
#     elif any(substring in item_conc for substring in ["shorts"]):
#         return "SHORTS"
#     elif any(substring in item_conc for substring in ["sombrero"]):
#         return "HEADWEAR"
#     elif any(substring in item_conc for substring in ["leggings", "legging", "leging"]):
#         return "TIGHTS"
#     elif any(substring in item_conc for substring in ["pants"]):
#         return "PANTS"
#     elif any(substring in item_conc for substring in ["panties", "tanga", "traje de baño", "bikini", "calzon", "calzón"]):
#         return "OTHER"
#     elif any(substring in item_conc for substring in ["chaleco"]):
#         return "OUTERWEAR"
#     elif any(substring in item_conc for substring in ["falda"]):
#         return "SKIRTS"
#     elif any(substring in item_conc for substring in ["gloves"]):
#         return "GLOVES"
#     elif any(substring in item_conc for substring in ["espinilleras"]):
#         return "PROTECTIVE"
#     elif any(substring in item_conc for substring in ["calcetines"]):
#         return "SOCKS"
#     elif any(substring in item_conc for substring in ["maleta"]):
#         return "BAGS"
#     else:
        # return current_subcategoria3  # Keep the current value if conditions do not apply


# proposals_df= pd.read_csv('new_products_with_hierarchy2024-02-12.csv')


# In[112]:


# Apply the mapping function to the "Item_conc" and current "Subcategoria_Nike" columns
proposals_df['Subcategoria_Nike'] = proposals_df.apply(lambda row: map_item_conc_to_subcategoria(row['Item_conc'], row['Subcategoria_Nike']), axis=1)
proposals_df['Subcategoria2_Nike'] = proposals_df.apply(lambda row: map_item_conc_to_subcategoria2(row['Item_conc'], row['Subcategoria2_Nike']), axis=1)
# proposals_df['Subcatgory3_Nike'] = proposals_df.apply(lambda row: map_item_conc_to_subcategoria3(row['Item_conc'], row['Subcatgory3_Nike']), axis=1)


# Check where 'Subcategoria_Nike2' contains 'KIDS'
kids_mask = proposals_df['Subcategoria2_Nike'].str.contains('KIDS', case=False)

# Update 'Subcategoria_Nike' where 'Subcategoria_Nike2' contains 'KIDS' to 'KIDS'
proposals_df.loc[kids_mask, 'Subcategoria_Nike'] = 'KIDS'
proposals_df


# In[113]:


# Define a function to concatenate the columns separated by "-"
def concatenate_columns(row):
    return '-'.join(row.astype(str))


# In[114]:


# Select the columns you want to concatenate
columns_to_concat = ['Categoria_Nike', 'Subcategoria_Nike', 'Subcategoria2_Nike', 'Subcatgory3_Nike', 'Subcatgory4_Nike', 'Subcatgory5_Nike']

# Create the new column 'concatenated_adjusted'
proposals_df['concatenated_adjusted'] = proposals_df[columns_to_concat].apply(concatenate_columns, axis=1)


# Define the desired column order
desired_column_order = [
    'Item_conc', 'Canal', 'SKU', 'UPC', 'Item', 'URL SKU', 'Image', 'proposal_conc', 'concatenated_adjusted',
    'Categoria_Nike', 'Subcategoria_Nike', 'Subcategoria2_Nike', 'Subcatgory3_Nike', 'Subcatgory4_Nike', 'Subcatgory5_Nike'
]

# Reorder the columns
proposals_df = proposals_df[desired_column_order]
proposals_df


# # Condicionales automatizadas

# In[32]:


condiciones_df = pd.read_csv(strPath+"/condiciones_automatizadas/condiciones.csv", encoding='utf-8-sig', sep = ";")
print(condiciones_df.columns)
condiciones_df = condiciones_df.dropna(subset = "Word")
condiciones_df.shape


# In[33]:


condiciones_df['Word'] = condiciones_df['Word'].str.replace('\\', '+', regex=False)
condiciones_df


# In[38]:


for _, cond in condiciones_df.iterrows():
    column = cond['Column']
    word = cond['Word']
    
    # Separar términos si contiene '+'
    if '+' in word:
        terms = word.split('+')
        # Asegurarse de que la búsqueda sea insensible a mayúsculas y minúsculas
        matching_rows = proposals_df[proposals_df[column].str.contains(terms[0], case=False, na=False) & proposals_df[column].str.contains(terms[1], case=False, na=False)]
    else:
        # Asegurarse de que la búsqueda sea insensible a mayúsculas y minúsculas
        matching_rows = proposals_df[proposals_df[column].str.contains(word, case=False, na=False)]
    
    for idx in matching_rows.index:
        for col in condiciones_df.columns:
            if col not in ['Column', 'Word', 'ELIMINAR'] and pd.notna(cond[col]):
                proposals_df.at[idx, col] = cond[col]
        
        # Verificar si se debe eliminar la fila
        if cond['ELIMINAR'] == 1:
            proposals_df.drop(idx, inplace=True)


# In[75]:


matchlayout_df = proposals_df.copy()
matchlayout_df


# In[76]:


rename_dict = {
    'Canal': 'Canal',
    'SKU': 'SKU',
    'UPC': 'UPC',
    'Item': 'Item',
    'URL SKU': 'URL SKU',
    'Image': 'Image',
    'Categoria_Nike': 'Categoria_Nike',
    'Subcategoria_Nike': 'Subcategoria_Nike',
    'Subcategoria2_Nike': 'Subcategoria2_Nike',
    'Subcatgory3_Nike': 'Subcatgory3_Nike',
    'Subcatgory4_Nike': 'Subcatgory4_Nike',
    'Subcatgory5_Nike': 'Subcatgory5_Nike'
}
columns_to_delete = ['proposal_conc', 'concatenated_adjusted', 'Item_conc']
new_column_order = [
    'key', 
    'Canal', 
    'Category', 
    'Subcategory', 
    'Subcategory2', 
    'Subcategory3', 
    'Marca', 
    'Modelo', 
    'SKU', 
    'UPC', 
    'Item', 
    'Item Characteristics', 
    'URL SKU', 
    'Image', 
    'Price', 
    'Categoria_Nike', 
    'Subcategoria_Nike', 
    'Subcategoria2_Nike', 
    'Subcatgory3_Nike', 
    'Subcatgory4_Nike', 
    'Subcatgory5_Nike'
]

matchlayout_df = matchlayout_df.rename(columns=rename_dict)
matchlayout_df = matchlayout_df.drop(columns=columns_to_delete)
for col in new_column_order:
    if col not in matchlayout_df.columns:
        matchlayout_df[col] = None
matchlayout_df = matchlayout_df[new_column_order]
matchlayout_df['key'] = np.where(
    matchlayout_df['Canal'] == "Nike Mx", 
    matchlayout_df['UPC'] + matchlayout_df['Canal'], 
    matchlayout_df['SKU'] + matchlayout_df['Canal']
)

matchlayout_df.head()


# In[77]:


matchlayout_df.to_csv(strPath + f'/match_proposal/{client_name}_matchProposal_{strDate}.csv', index = False, encoding="utf-8-sig")


# # CLIENT FILE TO PRODUCT MATCH LAYOUT

# In[69]:


dfClientHierarchyLayout = dfClient.copy()
dfClientHierarchyLayout


# In[71]:


rename_dict = {
    'Category': 'Categoria_Nike',
    'Subcategory': 'Subcategoria_Nike',
    'Subcategory2': 'Subcategoria2_Nike',
    'Subcategory3': 'Subcatgory3_Nike',
    'Modelo': 'Subcatgory4_Nike',
    'Stock': 'Subcatgory5_Nike'
}


columns_to_delete = [
    'Sale Price', 'Shipment Cost', 'Sales Flag', 'Store ID', 'Store Name', 
    'Store Address', 'UPC WM2', 'Final Price', 'UPC WM', 'COMP', 'Date'
]

new_column_order = [
    'key', 
    'Canal', 
    'Category', 
    'Subcategory', 
    'Subcategory2', 
    'Subcategory3', 
    'Marca', 
    'Modelo', 
    'SKU', 
    'UPC', 
    'Item', 
    'Item Characteristics', 
    'URL SKU', 
    'Image', 
    'Price', 
    'Categoria_Nike', 
    'Subcategoria_Nike', 
    'Subcategoria2_Nike', 
    'Subcatgory3_Nike', 
    'Subcatgory4_Nike', 
    'Subcatgory5_Nike'
]

dfClientHierarchyLayout = dfClientHierarchyLayout.rename(columns=rename_dict)
dfClientHierarchyLayout = dfClientHierarchyLayout.drop(columns=columns_to_delete)
for col in new_column_order:
    if col not in dfClientHierarchyLayout.columns:
        dfClientHierarchyLayout[col] = None
dfClientHierarchyLayout = dfClientHierarchyLayout[new_column_order]
dfClientHierarchyLayout.head()


# In[72]:


dfClientHierarchyLayout['SKU'] = dfClientHierarchyLayout['SKU'].astype(str)
dfClientHierarchyLayout['SKU']


# In[73]:


dfClientHierarchyLayout['key'] = np.where(
    dfClientHierarchyLayout['Canal'] == "Nike Mx", 
    dfClientHierarchyLayout['UPC'] + dfClientHierarchyLayout['Canal'], 
    dfClientHierarchyLayout['SKU'] +dfClientHierarchyLayout['Canal']
)
dfClientHierarchyLayout


# In[74]:


dfClientHierarchyLayout.to_csv(strPath + f'/match_proposal/{client_name}_clientLayout_{strDate}.csv', index = False, encoding="utf-8-sig")


# In[ ]:





# In[ ]:




