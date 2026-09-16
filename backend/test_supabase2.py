import psycopg2
try:
    conn = psycopg2.connect(
        host='db.gyaxymczbyphvwcnrwct.supabase.co',
        port=5432,
        dbname='postgres',
        user='postgres',
        password='asha@copoilot',
        sslmode='require',
        connect_timeout=15
    )
    cur = conn.cursor()
    cur.execute('SELECT version()')
    print('PostgreSQL:', cur.fetchone()[0][:60])
    cur.execute('SELECT tablename FROM pg_tables WHERE schemaname=public')
    tables = [r[0] for r in cur.fetchall()]
    print('Tables:', tables)
    conn.close()
    print('SUCCESS!')
except Exception as e:
    print('ERROR:', type(e).__name__, str(e))
