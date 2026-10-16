import psycopg2

def test_db():
    try:
        conn = psycopg2.connect(
            host="localhost",
            port=5440,
            database="teranga_civil",
            user="postgres",
            password="securepassword"
        )
        cur = conn.cursor()
        
        # Check tables list
        cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';")
        tables = cur.fetchall()
        print("Tables found:")
        for t in tables:
            print("-", t[0])
            
        # Check column names of pointages
        for table in ["pointages", "pointage_config", "facial_embeddings"]:
            print(f"\nColumns for {table}:")
            cur.execute(f"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = '{table}';")
            cols = cur.fetchall()
            for c in cols:
                print(f"  {c[0]}: {c[1]}")
                
        cur.close()
        conn.close()
    except Exception as e:
        print("Error connecting/querying database:", e)

if __name__ == "__main__":
    test_db()
