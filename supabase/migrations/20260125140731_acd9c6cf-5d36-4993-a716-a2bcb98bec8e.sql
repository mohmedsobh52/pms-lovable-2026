-- Add new contractor and financial columns to contracts table
ALTER TABLE contracts 
ADD COLUMN IF NOT EXISTS contractor_license_number TEXT,
ADD COLUMN IF NOT EXISTS contractor_phone TEXT,
ADD COLUMN IF NOT EXISTS contractor_email TEXT,
ADD COLUMN IF NOT EXISTS contractor_address TEXT,
ADD COLUMN IF NOT EXISTS contractor_category TEXT,
ADD COLUMN IF NOT EXISTS retention_percentage DECIMAL(5,2) DEFAULT 10,
ADD COLUMN IF NOT EXISTS advance_payment_percentage DECIMAL(5,2) DEFAULT 20,
ADD COLUMN IF NOT EXISTS performance_bond_value DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS performance_bond_percentage DECIMAL(5,2) DEFAULT 5,
ADD COLUMN IF NOT EXISTS execution_percentage DECIMAL(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS variation_limit_percentage DECIMAL(5,2) DEFAULT 15,
ADD COLUMN IF NOT EXISTS contract_duration_months INTEGER;