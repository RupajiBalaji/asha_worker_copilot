import psycopg2, socket

configs = [
    # Option 1: Session pooler (port 5432 on pooler host)
    {
        'name': 'Session pooler port 5432',
        'host': 'aws-0-ap-south-1.pooler.supabase.com',
        'port': 5432,
        'user': 'postgres.gyaxymczbyphvwcnrwct',
        'password': 'asha@copoilot',
        'dbname': 'postgres',
        'sslmode': 'require',
        'connect_timeout': 10,
    },
    # Option 2: Transaction pooler plain postgres user
    {
        'name': 'Transaction pooler plain user',
        'host': 'aws-0-ap-south-1.pooler.supabase.com',
        'port': 6543,
        'user': 'postgres',
        'password': 'asha@copoilot',
        'dbname': 'postgres',
        'sslmode': 'require',
        'connect_timeout': 10,
    },
]

for c in configs:
    name = c.pop('name')
    try:
        conn = psycopg2.connect(**c)
        cur = conn.cursor()
        cur.execute('SELECT version()')
        print(f'SUCCESS [{name}]:', cur.fetchone()[0][:40])
        conn.close()
    except Exception as e:
        print(f'FAIL [{name}]:', str(e)[:100])
