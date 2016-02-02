# -*- coding:utf-8 -*-
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
    0: TYPE_FLOAT,
    1: TYPE_INTEGER,
    2: TYPE_INTEGER,
    3: TYPE_INTEGER,
    4: TYPE_FLOAT,
    5: TYPE_FLOAT,
    7: TYPE_DATETIME,
    8: TYPE_INTEGER,
    9: TYPE_INTEGER,
    10: TYPE_DATE,
    12: TYPE_DATETIME,
    15: TYPE_STRING,
    16: TYPE_INTEGER,
    246: TYPE_FLOAT,
    253: TYPE_STRING,
    254: TYPE_STRING,
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

        # dsn = sql_server.makedsn(
        #     self.configuration["host"],
        #     self.configuration["port"],
        #     database=self.configuration["database"])
        # self.connection_string = "{}/{}@{}".format(self.configuration["user"], self.configuration["password"], dsn)

        # self.connection_string_obj = {'host':'','user':'','password':'','db':''}
        

    def _get_tables(self, schema):
        query = """
        select 
        'dbo' TABLESPACE_NAME ,
        c.name TABLE_NAME,
        t.name COLUMN_NAME
        type from sys.columns c,sys.types t, sys.tables tb 
        where c.system_type_id = t.system_type_id and tb.object_id = c.object_id

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

    # @classmethod
    # def _convert_number(cls, value):
    #     try:
    #         return int(value)
    #     except:
    #         return value

    # @classmethod
    # def output_handler(cls, cursor, name, default_type, length, precision, scale):
    #     if default_type in (cx_Oracle.CLOB, cx_Oracle.LOB):
    #         return cursor.var(cx_Oracle.LONG_STRING, 80000, cursor.arraysize)

    #     if default_type in (cx_Oracle.STRING, cx_Oracle.FIXED_CHAR):
    #         return cursor.var(unicode, length, cursor.arraysize)

    #     if default_type == cx_Oracle.NUMBER:
    #         if scale <= 0:
    #             return cursor.var(cx_Oracle.STRING, 255, outconverter=Oracle._convert_number, arraysize=cursor.arraysize)

    def run_query(self, query):
        import pymssql

        connection = None
        try:
            connection = pymssql.connect(host=self.configuration.get('host', ''),
                                         user=self.configuration.get('user', ''),
                                         password=self.configuration.get('password', ''),
                                         db=self.configuration['db'],
                                         port=self.configuration.get('port', 1433))
            #connection.outputtypehandler = Oracle.output_handler
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

            cursor.close()
        except sql_server.DatabaseError as err:
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
            connection.close()

        return json_data, error

register(sql_server)
