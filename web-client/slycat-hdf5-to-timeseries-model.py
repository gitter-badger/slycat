# Copyright 2013 Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000, there is a non-exclusive license for use of this work by
# or on behalf of the U.S. Government. Export of this program may require a
# license from the United States Government.

"""Compute a timeseries model locally from hdf5 data, uploading the results to Slycat Web Server.

This script loads data from a directory containing:

    One inputs.hdf5 file containing a single table.
    One timeseries-N.hdf5 file for each row in the input table.
"""

import collections
import datetime
import IPython.parallel
import itertools
import json
import numpy
import os
import scipy.cluster.hierarchy
import scipy.spatial.distance
import slycat.array
import slycat.hdf5
import slycat.web.client

parser = slycat.web.client.option_parser()
parser.add_argument("directory", help="Directory containing hdf5 timeseries data (one inputs.hdf5 and multiple timeseries-N.hdf5 files).")
parser.add_argument("--cluster-sample-count", type=int, default=1000, help="Sample count used for the uniform-pla and uniform-paa resampling algorithms.  Default: %(default)s")
parser.add_argument("--cluster-sample-type", default="uniform-paa", choices=["uniform-pla", "uniform-paa"], help="Resampling algorithm type.  Default: %(default)s")
parser.add_argument("--cluster-type", default="average", choices=["single", "complete", "average", "weighted"], help="Hierarchical clustering method.  Default: %(default)s")
parser.add_argument("--cluster-metric", default="euclidean", choices=["euclidean"], help="Hierarchical clustering distance metric.  Default: %(default)s")
parser.add_argument("--marking", default="", help="Marking type.  Default: %(default)s")
parser.add_argument("--model-description", default=None, help="New model description.  Defaults to a summary of the input parameters.")
parser.add_argument("--model-name", default=None, help="New model name.  Defaults to the name of the input data directory.")
parser.add_argument("--preview-max-error", default=0.01, help="Maximum preview timeseries error.  Default: %(default)s")
parser.add_argument("--project-description", default="", help="New project description.  Default: %(default)s")
parser.add_argument("--project-name", default="HDF5-Timeseries", help="New or existing project name.  Default: %(default)s")
arguments = parser.parse_args()

if arguments.cluster_sample_count < 1:
  raise Exception("Cluster sample count must be greater than zero.")

if arguments.model_name is None:
  arguments.model_name = os.path.basename(os.path.abspath(arguments.directory))

if arguments.model_description is None:
  arguments.model_description = ""
  arguments.model_description += "Input directory: %s.\n" % os.path.abspath(arguments.directory)
  arguments.model_description += "Cluster sampling algorithm: %s.\n" % {"uniform-pla":"Uniform PLA","uniform-paa":"Uniform PAA"}[arguments.cluster_sample_type]
  if arguments.cluster_sample_type in ["uniform-pla", "uniform-paa"]:
    arguments.model_description += "Cluster sample count: %s.\n" % arguments.cluster_sample_count
  arguments.model_description += "Cluster method: %s.\n" % arguments.cluster_type
  arguments.model_description += "Cluster distance metric: %s.\n" % arguments.cluster_metric
  arguments.model_description += "Preview method: sliding-window.\n"
  arguments.model_description += "Preview max error: %s.\n" % arguments.preview_max_error

pool = IPython.parallel.Client()

def mix(a, b, amount):
  return ((1.0 - amount) * a) + (amount * b)

# Setup a connection to the Slycat Web Server.
connection = slycat.web.client.connect(arguments)

# Create a new project to contain our model.
pid = connection.find_or_create_project(arguments.project_name, arguments.project_description)

# Create the new, empty model.
mid = connection.create_model(pid, "timeseries", arguments.model_name, arguments.marking, arguments.model_description)

# Compute the model.
try:
  # Store clustering parameters.
  connection.update_model(mid, message="Storing clustering parameters.")
  slycat.web.client.log.info("Storing clustering parameters.")

  connection.store_parameter(mid, "cluster-bin-count", arguments.cluster_sample_count)
  connection.store_parameter(mid, "cluster-bin-type", arguments.cluster_sample_type)
  connection.store_parameter(mid, "cluster-type", arguments.cluster_type)
  connection.store_parameter(mid, "cluster-metric", arguments.cluster_metric)
  connection.store_parameter(mid, "preview-max-error", arguments.preview_max_error)

  connection.update_model(mid, message="Storing input table.")

  with slycat.hdf5.open(os.path.join(arguments.directory, "inputs.hdf5")) as file:
    metadata = slycat.hdf5.get_array_metadata(file, 0)
    attributes = metadata["attributes"]
    dimensions = metadata["dimensions"]
    attributes = slycat.array.require_attributes(attributes)
    dimensions = slycat.array.require_dimensions(dimensions)
    if len(attributes) < 1:
      raise Exception("Inputs table must have at least one attribute.")
    if len(dimensions) != 1:
      raise Exception("Inputs table must have exactly one dimension.")
    timeseries_count = dimensions[0]["end"] - dimensions[0]["begin"]

    connection.start_array_set(mid, "inputs")
    connection.start_array(mid, "inputs", 0, attributes, dimensions)
    for attribute in range(len(attributes)):
      slycat.web.client.log.info("Storing input table attribute %s", attribute)
      data = slycat.hdf5.get_array_attribute(file, 0, attribute)[...]
      connection.store_array_set_data(mid, "inputs", 0, attribute, data=data)

  # Create a mapping from unique cluster names to timeseries attributes.
  connection.update_model(mid, state="running", started = datetime.datetime.utcnow().isoformat(), progress = 0.0, message="Mapping cluster names.")

  clusters = collections.defaultdict(list)
  for timeseries_index in range(timeseries_count):
    with slycat.hdf5.open(os.path.join(arguments.directory, "timeseries-%s.hdf5" % timeseries_index)) as file:
      metadata = slycat.hdf5.get_array_metadata(file, 0)
    attributes = slycat.array.require_attributes(metadata["attributes"][1:]) # Skip the timestamps
    if len(attributes) < 1:
      raise Exception("A timeseries must have at least one attribute.")
    for attribute_index, attribute in enumerate(attributes):
      clusters[attribute["name"]].append((timeseries_index, attribute_index))

  # Store an alphabetized collection of cluster names.
  connection.store_file(mid, "clusters", json.dumps(sorted(clusters.keys())), "application/json")

  # Get the minimum and maximum times for every timeseries.
  def get_time_range(directory, timeseries_index):
    import os
    import slycat.hdf5
    with slycat.hdf5.open(os.path.join(directory, "timeseries-%s.hdf5" % timeseries_index)) as file:
      metadata = slycat.hdf5.get_array_metadata(file, 0)
    return metadata["statistics"][0]["min"], metadata["statistics"][0]["max"]

  connection.update_model(mid, message="Collecting timeseries statistics.")
  slycat.web.client.log.info("Collecting timeseries statistics.")
  time_ranges = pool[:].map_sync(get_time_range, itertools.repeat(arguments.directory, timeseries_count), range(timeseries_count))

  # For each cluster ...
  for index, (name, storage) in enumerate(sorted(clusters.items())):
    progress_begin = float(index) / float(len(clusters))
    progress_end = float(index + 1) / float(len(clusters))

    # Rebin each timeseries within the cluster so they share common stop/start times and samples.
    connection.update_model(mid, message="Resampling data for %s" % name, progress=progress_begin)
    slycat.web.client.log.info("Resampling data for %s" % name)

    # Get the minimum and maximum times across every series in the cluster.
    ranges = [time_ranges[timeseries[0]] for timeseries in storage]
    time_min = min(zip(*ranges)[0])
    time_max = max(zip(*ranges)[1])

    if arguments.cluster_sample_type == "uniform-pla":
      def uniform_pla(directory, min_time, max_time, bin_count, preview_max_error, timeseries_index, attribute_index):
        import numpy
        import os
        import slycat.hdf5
        import slycat.timeseries.segmentation

        bin_edges = numpy.linspace(min_time, max_time, bin_count + 1)
        bin_times = (bin_edges[:-1] + bin_edges[1:]) / 2
        with slycat.hdf5.open(os.path.join(directory, "timeseries-%s.hdf5" % timeseries_index)) as file:
          original_times = slycat.hdf5.get_array_attribute(file, 0, 0)[:]
          original_values = slycat.hdf5.get_array_attribute(file, 0, attribute_index + 1)[:]
        bin_values = numpy.interp(bin_times, original_times, original_values)
        preview_times, preview_values = slycat.timeseries.segmentation.sliding_window(original_times, original_values, preview_max_error)
        return {
          "input-index" : timeseries_index,
          "analysis-times" : bin_times,
          "analysis-values" : bin_values,
          "preview-times" : preview_times,
          "preview-values" : preview_values,
        }
      directories = itertools.repeat(arguments.directory, len(storage))
      min_times = itertools.repeat(time_min, len(storage))
      max_times = itertools.repeat(time_max, len(storage))
      bin_counts = itertools.repeat(arguments.cluster_sample_count, len(storage))
      preview_max_error = itertools.repeat(arguments.preview_max_error, len(storage))
      timeseries_indices = [timeseries for timeseries, attribute in storage]
      attribute_indices = [attribute for timeseries, attribute in storage]
      waveforms = pool[:].map_sync(uniform_pla, directories, min_times, max_times, bin_counts, preview_max_error, timeseries_indices, attribute_indices)
    elif arguments.cluster_sample_type == "uniform-paa":
      def uniform_paa(directory, min_time, max_time, bin_count, preview_max_error, timeseries_index, attribute_index):
        import numpy
        import os
        import slycat.hdf5
        import slycat.timeseries.segmentation

        bin_edges = numpy.linspace(min_time, max_time, bin_count + 1)
        bin_times = (bin_edges[:-1] + bin_edges[1:]) / 2
        with slycat.hdf5.open(os.path.join(directory, "timeseries-%s.hdf5" % timeseries_index)) as file:
          original_times = slycat.hdf5.get_array_attribute(file, 0, 0)[:]
          original_values = slycat.hdf5.get_array_attribute(file, 0, attribute_index + 1)[:]
        bin_indices = numpy.digitize(original_times, bin_edges)
        bin_indices[-1] -= 1
        bin_counts = numpy.bincount(bin_indices)[1:]
        bin_sums = numpy.bincount(bin_indices, original_values)[1:]
        lonely_bins = (bin_counts < 2)
        bin_counts[lonely_bins] = 1
        bin_sums[lonely_bins] = numpy.interp(bin_times, original_times, original_values)[lonely_bins]
        bin_values = bin_sums / bin_counts
        preview_times, preview_values = slycat.timeseries.segmentation.sliding_window(original_times, original_values, preview_max_error)
        return {
          "input-index" : timeseries_index,
          "analysis-times" : bin_times,
          "analysis-values" : bin_values,
          "preview-times" : preview_times,
          "preview-values" : preview_values,
        }
      directories = itertools.repeat(arguments.directory, len(storage))
      min_times = itertools.repeat(time_min, len(storage))
      max_times = itertools.repeat(time_max, len(storage))
      bin_counts = itertools.repeat(arguments.cluster_sample_count, len(storage))
      preview_max_error = itertools.repeat(arguments.preview_max_error, len(storage))
      timeseries_indices = [timeseries for timeseries, attribute in storage]
      attribute_indices = [attribute for timeseries, attribute in storage]
      waveforms = pool[:].map_sync(uniform_paa, directories, min_times, max_times, bin_counts, preview_max_error, timeseries_indices, attribute_indices)

    for waveform in waveforms:
      slycat.web.client.log.info("Preview samples: %s" % (len(waveform["preview-times"])))

    # Compute a distance matrix comparing every series to every other ...
    observation_count = len(waveforms)
    distance_matrix = numpy.zeros(shape=(observation_count, observation_count))
    for i in range(0, observation_count):
      #connection.update_model(mid, message="Computing distance matrix for %s, %s of %s" % (name, i+1, observation_count), progress=mix(progress_begin, progress_end, float(i) / float(observation_count)))
      slycat.web.client.log.info("Computing distance matrix for %s, %s of %s" % (name, i+1, observation_count))
      for j in range(i + 1, observation_count):
        distance = numpy.sqrt(numpy.sum(numpy.power(waveforms[j]["analysis-values"] - waveforms[i]["analysis-values"], 2.0)))
        distance_matrix[i, j] = distance
        distance_matrix[j, i] = distance

    # Use the distance matrix to cluster observations ...
    connection.update_model(mid, message="Clustering %s" % name)
    slycat.web.client.log.info("Clustering %s" % name)
    distance = scipy.spatial.distance.squareform(distance_matrix)
    linkage = scipy.cluster.hierarchy.linkage(distance, method=str(arguments.cluster_type), metric=str(arguments.cluster_metric))

    # Identify exemplar waveforms for each cluster ...
    summed_distances = numpy.zeros(shape=(observation_count))
    exemplars = dict()
    cluster_membership = []

    for i in range(observation_count):
      exemplars[i] = i
      cluster_membership.append(set([i]))

    connection.update_model(mid, message="Identifying examplars for %s" % (name))
    slycat.web.client.log.info("Identifying examplars for %s" % (name))
    for i in range(len(linkage)):
      cluster_id = i + observation_count
      (f_cluster1, f_cluster2, height, total_observations) = linkage[i]
      cluster1 = int(f_cluster1)
      cluster2 = int(f_cluster2)
      # Housekeeping: assemble the membership of the new cluster
      cluster_membership.append(cluster_membership[cluster1].union(cluster_membership[cluster2]))
      #cherrypy.log.error("Finding exemplar for cluster %s containing %s members from %s and %s." % (cluster_id, len(cluster_membership[-1]), cluster1, cluster2))

      # We need to update the distance from each member of the new
      # cluster to all the other members of the cluster.  That means
      # that for all the members of cluster1, we need to add in the
      # distances to members of cluster2, and for all members of
      # cluster2, we need to add in the distances to members of
      # cluster1.
      for cluster1_member in cluster_membership[cluster1]:
        for cluster2_member in cluster_membership[cluster2]:
          summed_distances[cluster1_member] += distance_matrix[cluster1_member][cluster2_member]

      for cluster2_member in cluster_membership[int(cluster2)]:
        for cluster1_member in cluster_membership[cluster1]:
          summed_distances[cluster2_member] += distance_matrix[cluster2_member][cluster1_member]

      min_summed_distance = None
      max_summed_distance = None

      exemplar_id = 0
      for member in cluster_membership[cluster_id]:
        if min_summed_distance is None or summed_distances[member] < min_summed_distance:
          min_summed_distance = summed_distances[member]
          exemplar_id = member

        if max_summed_distance is None or summed_distances[member] > min_summed_distance:
          max_summed_distance = summed_distances[member]

      exemplars[cluster_id] = exemplar_id

    # Store the cluster.
    slycat.web.client.log.info("Storing %s" % name)
    connection.store_file(mid, "cluster-%s" % name, json.dumps({
      "linkage":linkage.tolist(),
      "exemplars":exemplars,
      "input-indices":[waveform["input-index"] for waveform in waveforms],
      }), "application/json")

    connection.start_array_set(mid, "preview-%s" % name)
    for index, waveform in enumerate(waveforms):
      slycat.web.client.log.info("Creating preview %s" % index)
      attributes = [("time", "float64"), ("value", "float64")]
      dimensions = [("sample", "int64", 0, len(waveform["preview-times"]))]
      connection.start_array(mid, "preview-%s" % name, index, attributes, dimensions)

    slycat.web.client.log.info("Storing previews")
    connection.store_array_set_data(mid, "preview-%s" % name, data=[waveform[key] for waveform in waveforms for key in ["preview-times", "preview-values"]])

  connection.update_model(mid, state="finished", result="succeeded", finished=datetime.datetime.utcnow().isoformat(), progress=1.0, message="")
except:
  import traceback
  slycat.web.client.log.error(traceback.format_exc())
  connection.update_model(mid, state="finished", result="failed", finished=datetime.datetime.utcnow().isoformat(), message=traceback.format_exc())

# Supply the user with a direct link to the new model.
slycat.web.client.log.info("Your new model is located at %s/models/%s" % (arguments.host, mid))
