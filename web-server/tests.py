# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

import nose
import numpy
import slycat.web.client
import subprocess
import sys
import time

server_process = None
connection = None

def setup():
  global server_process, connection
  server_process = subprocess.Popen(["python", "slycat-web-server.py", "--config=test-config.ini"])
  time.sleep(2.0)
  connection = slycat.web.client.connection(host="https://localhost:8093", proxies={"http":"", "https":""}, verify=False, auth=("slycat", "slycat"), log=slycat.web.client.dev_null())

def teardown():
  global server_process
  server_process.terminate()
  server_process.wait()

def test_array_chunker():
  for attribute, type in enumerate(["int8", "int16", "int32", "int64", "uint8", "uint16", "uint32", "uint64", "float32", "float64"]):
    for byteorder, prefix in [("little", "<"), ("big", ">")]:
      yield check_array_chunker, attribute, type, byteorder, prefix + numpy.dtype(type).str[1:]

def check_array_chunker(attribute, type, byteorder, dtype):
  wid = connection.create_test_array_chunker([4, 4])

  metadata = connection.get_array_chunker_metadata(wid)
  nose.tools.assert_equal(metadata["attributes"], [{"name":"int8","type":"int8"},{"name":"int16","type":"int16"},{"name":"int32","type":"int32"},{"name":"int64","type":"int64"},{"name":"uint8","type":"uint8"},{"name":"uint16","type":"uint16"},{"name":"uint32","type":"uint32"},{"name":"uint64","type":"uint64"},{"name":"float32","type":"float32"},{"name":"float64","type":"float64"},{"name":"string","type":"string"}])
  nose.tools.assert_equal(metadata["dimensions"], [{"begin":0, "end":4, "name":"d0", "type":"int64"}, {"begin":0, "end":4, "name":"d1", "type":"int64"}])

  chunk = connection.get_array_chunker_chunk(wid, attribute, [0, 3, 0, 2], byteorder=byteorder)
  chunk = numpy.frombuffer(chunk, dtype=dtype).reshape((3, 2))
  numpy.testing.assert_array_equal(chunk, [[0, 1], [4, 5], [8, 9]])

  connection.delete_worker(wid)

def test_array_chunker_string():
  wid = connection.create_test_array_chunker([4, 4])

  metadata = connection.get_array_chunker_metadata(wid)
  nose.tools.assert_equal(metadata["attributes"], [{"name":"int8","type":"int8"},{"name":"int16","type":"int16"},{"name":"int32","type":"int32"},{"name":"int64","type":"int64"},{"name":"uint8","type":"uint8"},{"name":"uint16","type":"uint16"},{"name":"uint32","type":"uint32"},{"name":"uint64","type":"uint64"},{"name":"float32","type":"float32"},{"name":"float64","type":"float64"},{"name":"string","type":"string"}])
  nose.tools.assert_equal(metadata["dimensions"], [{"begin":0, "end":4, "name":"d0", "type":"int64"}, {"begin":0, "end":4, "name":"d1", "type":"int64"}])

  chunk = numpy.array(connection.get_array_chunker_chunk(wid, 10, [0, 3, 0, 2]))
  numpy.testing.assert_array_equal(chunk, [["0", "1"], ["4", "5"], ["8", "9"]])

  connection.delete_worker(wid)