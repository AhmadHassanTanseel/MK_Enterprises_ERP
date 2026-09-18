import re

files_to_fix = [
    'src/features/sales/SaleInvoicePanel.tsx',
    'src/features/purchases/PurchaseInvoicePanel.tsx'
]

for file_path in files_to_fix:
    with open(file_path, 'r', encoding='utf-8') as f:
        code = f.read()

    # The current line is:
    # <div className="flex flex-row gap-6 justify-between items-end w-full overflow-x-auto pb-2">
    
    # We want to replace it with a wrapper:
    new_wrapper = """<div className="w-full overflow-x-auto pb-2">
            <div className="flex flex-row gap-6 justify-between items-end min-w-max w-full">"""
    
    code = code.replace(
        '<div className="flex flex-row gap-6 justify-between items-end w-full overflow-x-auto pb-2">',
        new_wrapper
    )
    
    # And we need to add an extra closing </div> at the end of the footer block.
    # In both files, the footer block ends with:
    #           </div>
    #         </div>
    #       </div>
    #     </div>
    #   );
    # };
    #
    # Wait, the best way is to find the buttons block end.
    
    # Let's just find `</button>\n            </div>\n          </div>`
    # and replace with `</button>\n            </div>\n          </div>\n          </div>`
    
    code = code.replace(
        '</button>\n            </div>\n          </div>\n        </div>\n      </div>\n    </div>',
        '</button>\n            </div>\n          </div>\n        </div>\n      </div>\n      </div>\n    </div>'
    )
    # Wait, the structure in PurchaseInvoice is slightly different. Let's look exactly at the end of the file.
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(code)
