# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

"""Slycat uses `CouchDB <http://couchdb.apache.org>`_ as its primary storage
index, tracking projects, models, bookmarks, along with metadata and small
model artficats.  For large model artifacts such as
:mod:`darrays<slycat.darray>`, the CouchDB database stores links to HDF5 files
stored on disk.
"""

from __future__ import absolute_import

import cherrypy
import couchdb.client
import threading
import uuid

class Document(object):
  def __init__(self, storage, lock, id, type):
    self._storage = storage
    self._lock = lock
    self._id = id
    self._type = type
  def __enter__(self):
    self._lock.__enter__()
    try:
      document = self._storage[self._id]
    except couchdb.client.http.ResourceNotFound:
      raise cherrypy.HTTPError(404)
    if document["type"] != self._type:
      raise cherrypy.HTTPError(404)
    return document
  def __exit__(self, exc_type, exc_value, traceback):
    self._lock.__exit__(exc_type, exc_value, traceback)

class Database(object):
  def __init__(self, storage):
    self._storage = storage
    self._locks = dict()
    self._locks_lock = threading.Lock()

  def get(self, type, id):
    with self._locks_lock:
      if id not in self._locks:
        self._locks[id] = threading.Lock()
      return Document(self._storage, self._locks[id], id, type)

  def save(self, *arguments, **keywords):
    try:
      return self._storage.save(*arguments, **keywords)
    except couchdb.http.ServerError as e:
      raise cherrypy.HTTPError("%s %s" % (e.message[0], e.message[1][1]))

def database(url=None, name=None):
  with database._instance_lock:
    if database._instance is None:
      if url is None:
        url = cherrypy.tree.apps[""].config["slycat"]["couchdb-host"]
      if name is None:
        name = cherrypy.tree.apps[""].config["slycat"]["couchdb-database"]
      database._instance = Database(couchdb.client.Server(url=url)[name])
  return database._instance
database._instance = None
database._instance_lock = threading.Lock()

