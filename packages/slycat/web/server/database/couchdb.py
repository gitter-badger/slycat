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

class Database(object):
  def __init__(self, storage):
    self._storage = storage

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

#################################################################################################################
# Deprecated API, don't use in new code.

class database_wrapper:
  """Wraps a :class:`couchdb.client.Database` to convert CouchDB exceptions into CherryPy exceptions."""
  def __init__(self, database):
    self.database = database

  def __getitem__(self, *arguments, **keywords):
    return self.database.__getitem__(*arguments, **keywords)

  def changes(self, *arguments, **keywords):
    return self.database.changes(*arguments, **keywords)

  def delete(self, *arguments, **keywords):
    return self.database.delete(*arguments, **keywords)

  def get_attachment(self, *arguments, **keywords):
    return self.database.get_attachment(*arguments, **keywords)

  def put_attachment(self, *arguments, **keywords):
    return self.database.put_attachment(*arguments, **keywords)

  def save(self, *arguments, **keywords):
    try:
      return self.database.save(*arguments, **keywords)
    except couchdb.http.ServerError as e:
      raise cherrypy.HTTPError("%s %s" % (e.message[0], e.message[1][1]))

  def view(self, *arguments, **keywords):
    return self.database.view(*arguments, **keywords)

  def scan(self, path, **keywords):
    for row in self.view(path, include_docs=True, **keywords):
      document = row["doc"]
      yield document

  def get(self, type, id):
    try:
      document = self[id]
    except couchdb.client.http.ResourceNotFound:
      raise cherrypy.HTTPError(404)
    if document["type"] != type:
      raise cherrypy.HTTPError(404)
    return document

  def write_file(self, document, content, content_type):
    fid = uuid.uuid4().hex
    self.put_attachment(document, content, filename=fid, content_type=content_type)
    return fid

def connect():
  """Connect to a CouchDB database.

  Returns
  -------
  database : :class:`slycat.web.server.database.couchdb.database_wrapper`
  """
  server = couchdb.client.Server(url=cherrypy.tree.apps[""].config["slycat"]["couchdb-host"])
  database = database_wrapper(server[cherrypy.tree.apps[""].config["slycat"]["couchdb-database"]])
  return database
