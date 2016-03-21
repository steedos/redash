import json
import logging
import sys

from redash.query_runner import *
from redash.utils import JSONEncoder


logger = logging.getLogger(__name__)

try:
    import pymssql

    ENABLED = True
except ImportError:
    ENABLED = False
    logging.exception(ImportError.message)



types_map = {   
    1: TYPE_STRING,
    2: TYPE_BOOLEAN,
    3: TYPE_INTEGER,
    4: TYPE_DATETIME,
    5: TYPE_FLOAT
    
}

class sql_server(BaseSQLQueryRunner):

    @classmethod
    def configuration_schema(cls):
        return {
            "type": "object",
            "properties": {
                "user": {
                    "type": "string"
                },
                "password": {
                    "type": "string"
                },
                "host": {
                    "type": "string"
                },
                "port": {
                    "type": "number",
                    'default': 1433
                },
                "db": {
                    "type": "string",
                    "title": "Database"
                }
            },
            "required": ["db"],
            "secret": ["password"]
        }

    @classmethod
    def type(cls):
        return "sql server"

    def __init__(self, configuration_json):
        super(sql_server, self).__init__(configuration_json)
        

    def _get_tables(self, schema):
        query = """
        select 
        'dbo' TABLESPACE_NAME,
        tb.name TABLE_NAME,
        c.name COLUMN_NAME 
        from sys.columns c,sys.tables tb 
        where tb.object_id = c.object_id
        """

        results, error = self.run_query(query)

        if error is not None:
            raise Exception("Failed getting schema.")

        results = json.loads(results)

        for row in results['rows']:
            if row['TABLESPACE_NAME'] != None:
                table_name = '{}.{}'.format(row['TABLESPACE_NAME'], row['TABLE_NAME'])
            else:
                table_name = row['TABLE_NAME']

            if table_name not in schema:
                schema[table_name] = {'name': table_name, 'columns': []}

            schema[table_name]['columns'].append(row['COLUMN_NAME'])

        return schema.values()


    def run_query(self, query):

        connection = None
        try:
            connection = pymssql.connect(server=self.configuration.get('host', ''),
                                         user=self.configuration.get('user', ''),
                                         password=self.configuration.get('password', ''),
                                         database=self.configuration.get('db',''),
                                         port=self.configuration.get('port', 1433)
                                         )
            cursor = connection.cursor()
            logger.debug("sql server running query: %s", query)
            
            cursor.execute(query)

            data = cursor.fetchall()
            if cursor.description is not None:
                columns = self.fetch_columns([(i[0], types_map.get(i[1], None)) for i in cursor.description])
                rows = [dict(zip((c['name'] for c in columns), row)) for row in data]    
                data = {'columns': columns, 'rows': rows}
                json_data = json.dumps(data, cls=JSONEncoder)
                error = None
            else:
                json_data = None
                error = "No data was returned."

        except pymssql.DatabaseError as err:
            logging.exception(err.message)
            error = "Query failed. {}.".format(err.message)
            json_data = None
        except KeyboardInterrupt:
            connection.cancel()
            error = "Query cancelled by user."
            json_data = None
        except Exception as err:
            raise sys.exc_info()[1], None, sys.exc_info()[2]
        finally:
            if connection:
                connection.close()

        return json_data, error

register(sql_server)
