import psycopg2
try:
    conn = psycopg2.connect(
        host='db.gyaxymczbyphvwcnrwct.supabase.co',
        port=5432,
        dbname='postgres',
        user='postgres',
        password='asha@copoilot',
        sslmode='require'
    )
    cur = conn.cursor()
    cur.execute('SELECT COUNT(*) FROM patients')
    count = cur.fetchone()[0]
    print('Patients in Supabase:', count)
    cur.execute('SELECT tablename FROM pg_tables WHERE schemaname=public')
    tables = [r[0] for r in cur.fetchall()]
    print('Tables:', tables)
    conn.close()
    print('SUCCESS: Connected to Supabase!')
except Exception as e:
    print('ERROR:', str(e))
